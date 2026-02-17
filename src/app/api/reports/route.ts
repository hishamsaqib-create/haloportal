import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    await requireInternal()
    const { searchParams } = new URL(req.url)

    const type = searchParams.get('type')
    const periodStart = searchParams.get('periodStart')
    const periodEnd = searchParams.get('periodEnd')
    const clinicId = searchParams.get('clinicId')

    if (!type) {
      return NextResponse.json(
        { error: 'type parameter is required. Valid types: revenue, turnaround, remakes, ar-ap, department' },
        { status: 400 }
      )
    }

    const startDate = periodStart ? new Date(periodStart) : new Date(new Date().getFullYear(), 0, 1) // Default: start of year
    const endDate = periodEnd ? new Date(periodEnd) : new Date()

    const dateFilter = {
      gte: startDate,
      lte: endDate,
    }

    switch (type) {
      case 'revenue': {
        // Revenue report: invoice totals grouped by month
        const invoices = await prisma.invoice.findMany({
          where: {
            createdAt: dateFilter,
            status: { in: ['SENT', 'PAID', 'OVERDUE'] },
            ...(clinicId ? { clinicId } : {}),
          },
          select: {
            id: true,
            invoiceNo: true,
            total: true,
            vatAmount: true,
            subtotal: true,
            status: true,
            createdAt: true,
            clinic: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        })

        // Aggregate by month
        const monthlyRevenue: Record<string, { month: string; subtotal: number; vat: number; total: number; count: number }> = {}
        for (const inv of invoices) {
          const monthKey = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey] = { month: monthKey, subtotal: 0, vat: 0, total: 0, count: 0 }
          }
          monthlyRevenue[monthKey].subtotal += inv.subtotal
          monthlyRevenue[monthKey].vat += inv.vatAmount
          monthlyRevenue[monthKey].total += inv.total
          monthlyRevenue[monthKey].count += 1
        }

        const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
        const paidRevenue = invoices.filter((i) => i.status === 'PAID').reduce((sum, inv) => sum + inv.total, 0)

        return NextResponse.json({
          data: {
            type: 'revenue',
            period: { start: startDate.toISOString(), end: endDate.toISOString() },
            summary: {
              totalRevenue,
              paidRevenue,
              outstandingRevenue: totalRevenue - paidRevenue,
              invoiceCount: invoices.length,
            },
            monthly: Object.values(monthlyRevenue),
            invoices,
          },
        })
      }

      case 'turnaround': {
        // Turnaround report: average time from NEW to COMPLETED
        const completedCases = await prisma.case.findMany({
          where: {
            status: 'COMPLETED',
            createdAt: dateFilter,
            ...(clinicId ? { clinicId } : {}),
          },
          select: {
            id: true,
            caseNumber: true,
            department: true,
            createdAt: true,
            updatedAt: true,
            clinic: { select: { id: true, name: true } },
          },
        })

        // Calculate turnaround times
        const turnaroundData = completedCases.map((c) => {
          const turnaroundMs = c.updatedAt.getTime() - c.createdAt.getTime()
          const turnaroundDays = turnaroundMs / (1000 * 60 * 60 * 24)
          return {
            caseId: c.id,
            caseNumber: c.caseNumber,
            department: c.department,
            clinic: c.clinic.name,
            turnaroundDays: Math.round(turnaroundDays * 10) / 10,
          }
        })

        // Aggregate by department
        const byDepartment: Record<string, { department: string; count: number; totalDays: number; avgDays: number }> = {}
        for (const t of turnaroundData) {
          if (!byDepartment[t.department]) {
            byDepartment[t.department] = { department: t.department, count: 0, totalDays: 0, avgDays: 0 }
          }
          byDepartment[t.department].count += 1
          byDepartment[t.department].totalDays += t.turnaroundDays
        }
        for (const dept of Object.values(byDepartment)) {
          dept.avgDays = Math.round((dept.totalDays / dept.count) * 10) / 10
        }

        const overallAvg = turnaroundData.length > 0
          ? Math.round(
              (turnaroundData.reduce((sum, t) => sum + t.turnaroundDays, 0) / turnaroundData.length) * 10
            ) / 10
          : 0

        return NextResponse.json({
          data: {
            type: 'turnaround',
            period: { start: startDate.toISOString(), end: endDate.toISOString() },
            summary: {
              totalCases: turnaroundData.length,
              averageTurnaroundDays: overallAvg,
            },
            byDepartment: Object.values(byDepartment),
            cases: turnaroundData,
          },
        })
      }

      case 'remakes': {
        // Remakes report: count and cost by reason code
        const remakes = await prisma.remake.findMany({
          where: {
            createdAt: dateFilter,
          },
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                department: true,
                clinic: { select: { id: true, name: true } },
              },
            },
            caseItem: { select: { id: true, description: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Aggregate by reason code
        const byReason: Record<string, { reasonCode: string; count: number; totalCost: number }> = {}
        for (const r of remakes) {
          if (!byReason[r.reasonCode]) {
            byReason[r.reasonCode] = { reasonCode: r.reasonCode, count: 0, totalCost: 0 }
          }
          byReason[r.reasonCode].count += 1
          byReason[r.reasonCode].totalCost += r.costEstimate ?? 0
        }

        // Total cases in period for rate calculation
        const totalCases = await prisma.case.count({
          where: { createdAt: dateFilter },
        })

        return NextResponse.json({
          data: {
            type: 'remakes',
            period: { start: startDate.toISOString(), end: endDate.toISOString() },
            summary: {
              totalRemakes: remakes.length,
              totalCasesInPeriod: totalCases,
              remakeRate: totalCases > 0 ? Math.round((remakes.length / totalCases) * 10000) / 100 : 0,
              totalEstimatedCost: remakes.reduce((sum, r) => sum + (r.costEstimate ?? 0), 0),
            },
            byReason: Object.values(byReason),
            remakes,
          },
        })
      }

      case 'ar-ap': {
        // Accounts Receivable / Accounts Payable
        const outstandingInvoices = await prisma.invoice.findMany({
          where: {
            status: { in: ['SENT', 'OVERDUE'] },
          },
          select: {
            id: true,
            invoiceNo: true,
            total: true,
            status: true,
            dueDate: true,
            createdAt: true,
            clinic: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
        })

        const outstandingSupplier = await prisma.supplierInvoice.findMany({
          where: {
            status: { in: ['UNPAID', 'DISPUTED'] },
          },
          select: {
            id: true,
            supplierInvoiceNo: true,
            total: true,
            status: true,
            dueDate: true,
            referralCentre: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
        })

        const totalAR = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0)
        const totalAP = outstandingSupplier.reduce((sum, inv) => sum + inv.total, 0)

        // Aging buckets for AR
        const now = new Date()
        const arAging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
        for (const inv of outstandingInvoices) {
          if (!inv.dueDate) {
            arAging.current += inv.total
            continue
          }
          const daysPast = Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          if (daysPast <= 0) arAging.current += inv.total
          else if (daysPast <= 30) arAging.days30 += inv.total
          else if (daysPast <= 60) arAging.days60 += inv.total
          else if (daysPast <= 90) arAging.days90 += inv.total
          else arAging.over90 += inv.total
        }

        return NextResponse.json({
          data: {
            type: 'ar-ap',
            summary: {
              totalAccountsReceivable: totalAR,
              totalAccountsPayable: totalAP,
              netPosition: totalAR - totalAP,
            },
            accountsReceivable: {
              total: totalAR,
              count: outstandingInvoices.length,
              aging: arAging,
              invoices: outstandingInvoices,
            },
            accountsPayable: {
              total: totalAP,
              count: outstandingSupplier.length,
              invoices: outstandingSupplier,
            },
          },
        })
      }

      case 'department': {
        // Department workload report
        const cases = await prisma.case.findMany({
          where: {
            createdAt: dateFilter,
            ...(clinicId ? { clinicId } : {}),
          },
          select: {
            id: true,
            department: true,
            status: true,
            priority: true,
          },
        })

        // Aggregate by department and status
        const byDepartment: Record<string, {
          department: string
          total: number
          byStatus: Record<string, number>
          byPriority: Record<string, number>
        }> = {}

        for (const c of cases) {
          if (!byDepartment[c.department]) {
            byDepartment[c.department] = {
              department: c.department,
              total: 0,
              byStatus: {},
              byPriority: {},
            }
          }
          byDepartment[c.department].total += 1
          byDepartment[c.department].byStatus[c.status] = (byDepartment[c.department].byStatus[c.status] || 0) + 1
          byDepartment[c.department].byPriority[c.priority] = (byDepartment[c.department].byPriority[c.priority] || 0) + 1
        }

        // Active cases (not COMPLETED or CANCELLED)
        const activeCases = cases.filter((c) => !['COMPLETED', 'CANCELLED'].includes(c.status))

        return NextResponse.json({
          data: {
            type: 'department',
            period: { start: startDate.toISOString(), end: endDate.toISOString() },
            summary: {
              totalCases: cases.length,
              activeCases: activeCases.length,
              completedCases: cases.filter((c) => c.status === 'COMPLETED').length,
              cancelledCases: cases.filter((c) => c.status === 'CANCELLED').length,
            },
            byDepartment: Object.values(byDepartment),
          },
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown report type: ${type}. Valid types: revenue, turnaround, remakes, ar-ap, department` },
          { status: 400 }
        )
    }
  } catch (error) {
    return handleAuthError(error)
  }
}
