import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, scopeInvoiceQuery, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { createInvoiceSchema } from '@/lib/validations'
import { resolvePrice, calculateLineTotal, parseToothNumbers } from '@/lib/pricing'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status')
    const clinicId = searchParams.get('clinicId')
    const dentistId = searchParams.get('dentistId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const scopeWhere = scopeInvoiceQuery(user)
    const where: Record<string, unknown> = { ...scopeWhere }

    if (status) where.status = status
    if (clinicId && user.userType === 'INTERNAL') where.clinicId = clinicId
    if (dentistId && user.userType !== 'DENTIST') where.dentistId = dentistId

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
          lines: {
            include: {
              case: { select: { id: true, caseNumber: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('invoices:write')
    const body = await req.json()
    const validated = createInvoiceSchema.parse(body)

    // Check system VAT setting
    const [vatEnabledSetting, vatRateSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: 'vat_enabled' } }),
      prisma.systemSettings.findUnique({ where: { key: 'vat_rate' } }),
    ])

    const vatEnabled = vatEnabledSetting?.value !== 'false' // Default to enabled
    const systemVatRate = vatRateSetting ? parseFloat(vatRateSetting.value) : 20

    // Build query for cases to invoice
    const caseWhere: Record<string, unknown> = {
      clinicId: validated.clinicId,
      status: 'COMPLETED',
      invoiceLines: { none: {} }, // Not yet invoiced
    }

    if (validated.dentistId) {
      caseWhere.dentistId = validated.dentistId
    }

    // Period filters
    let periodStart: Date | undefined
    let periodEnd: Date | undefined

    if (validated.periodStart) {
      periodStart = new Date(validated.periodStart)
      caseWhere.createdAt = { ...((caseWhere.createdAt as Record<string, unknown>) || {}), gte: periodStart }
    }
    if (validated.periodEnd) {
      periodEnd = new Date(validated.periodEnd)
      caseWhere.createdAt = { ...((caseWhere.createdAt as Record<string, unknown>) || {}), lte: periodEnd }
    }

    // If specific case IDs provided, use those instead
    if (validated.caseIds && validated.caseIds.length > 0) {
      caseWhere.id = { in: validated.caseIds }
      // Remove the "not yet invoiced" constraint when explicit IDs are given
      delete caseWhere.invoiceLines
    }

    const cases = await prisma.case.findMany({
      where: caseWhere,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (cases.length === 0) {
      return NextResponse.json(
        { error: 'No eligible cases found for invoicing' },
        { status: 400 }
      )
    }

    // Generate invoice number: INV-YYYY-XXXX
    const year = new Date().getFullYear()
    const invoiceCount = await prisma.invoice.count()
    const invoiceNo = `INV-${year}-${String(invoiceCount + 1).padStart(4, '0')}`

    // Build invoice lines from case items with per-tooth pricing
    const invoiceLines: Array<{
      caseId: string
      caseItemId: string
      description: string
      qty: number
      unitPrice: number
      total: number
      toothCount: number | null
      additionalTeeth: number | null
    }> = []

    let subtotal = 0
    for (const caseData of cases) {
      for (const item of caseData.items) {
        // Resolve pricing (including per-tooth config) for the product
        let unitPrice = item.unitPrice
        let minTeeth: number | null = null
        let additionalToothPrice: number | null = null

        if (item.productId) {
          const resolved = await resolvePrice(
            item.productId,
            caseData.clinicId,
            caseData.dentistId
          )
          unitPrice = resolved.price
          minTeeth = resolved.minTeeth
          additionalToothPrice = resolved.additionalToothPrice
        }

        // Calculate tooth count and line total with per-tooth pricing
        const teeth = parseToothNumbers(item.toothNumbers)
        const toothCount = teeth.length > 0 ? teeth.length : null
        const lineTotal = calculateLineTotal(
          unitPrice,
          item.qty,
          item.toothNumbers,
          minTeeth,
          additionalToothPrice
        )

        // Calculate additional teeth above minimum
        let additionalTeeth: number | null = null
        if (toothCount && minTeeth && toothCount > minTeeth) {
          additionalTeeth = toothCount - minTeeth
        }

        invoiceLines.push({
          caseId: caseData.id,
          caseItemId: item.id,
          description: `${caseData.caseNumber} - ${item.description}`,
          qty: item.qty,
          unitPrice,
          total: lineTotal,
          toothCount,
          additionalTeeth,
        })
        subtotal += lineTotal
      }
    }

    // Apply VAT based on system setting
    let vatRate: number
    let vatAmount: number

    if (!vatEnabled) {
      // VAT is disabled system-wide
      vatRate = 0
      vatAmount = 0
    } else {
      // Use the validated rate from the request, or fall back to system rate
      vatRate = validated.vatRate ?? systemVatRate
      vatAmount = subtotal * (vatRate / 100)
    }

    const total = subtotal + vatAmount

    // Calculate due date from clinic payment terms
    const clinic = await prisma.clinic.findUnique({
      where: { id: validated.clinicId },
    })
    const paymentTermDays = clinic?.paymentTermDays ?? 30
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + paymentTermDays)

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        clinicId: validated.clinicId,
        dentistId: validated.dentistId || null,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        status: 'DRAFT',
        subtotal,
        vatRate,
        vatAmount,
        total,
        dueDate,
        lines: {
          create: invoiceLines,
        },
      },
      include: {
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
        lines: {
          include: {
            case: { select: { id: true, caseNumber: true } },
          },
        },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'INVOICE_GENERATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValue: {
        invoiceNo: invoice.invoiceNo,
        clinicId: validated.clinicId,
        caseCount: cases.length,
        subtotal,
        vatRate,
        vatEnabled,
        vatAmount,
        total,
      },
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
