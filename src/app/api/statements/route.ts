import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError, AuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const clinicId = searchParams.get('clinicId')
    const dentistId = searchParams.get('dentistId')
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    // Scope based on user type
    if (user.userType === 'CLINIC') {
      where.clinicId = user.clinicId!
    } else if (user.userType === 'DENTIST') {
      where.dentistId = user.dentistId!
    } else {
      // Internal users can filter
      if (clinicId) where.clinicId = clinicId
      if (dentistId) where.dentistId = dentistId
    }

    if (status) where.status = status

    const [statements, total] = await Promise.all([
      prisma.statement.findMany({
        where,
        include: {
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.statement.count({ where }),
    ])

    return NextResponse.json({
      data: statements,
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
    const user = await requirePermission('statements:write')
    const body = await req.json()

    const { clinicId, dentistId, periodStart, periodEnd } = body

    if (!clinicId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'clinicId, periodStart, and periodEnd are required' },
        { status: 400 }
      )
    }

    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    if (start >= end) {
      return NextResponse.json(
        { error: 'periodStart must be before periodEnd' },
        { status: 400 }
      )
    }

    // Pull invoices in the period for the clinic/dentist
    const invoiceWhere: Record<string, unknown> = {
      clinicId,
      createdAt: {
        gte: start,
        lte: end,
      },
      status: { in: ['SENT', 'PAID', 'OVERDUE'] },
    }
    if (dentistId) invoiceWhere.dentistId = dentistId

    const invoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        status: true,
        paidDate: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Calculate total due (only unpaid invoices)
    const totalDue = invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + inv.total, 0)

    const statement = await prisma.statement.create({
      data: {
        clinicId,
        dentistId: dentistId || null,
        periodStart: start,
        periodEnd: end,
        totalDue,
        status: 'DRAFT',
        notes: body.notes || null,
      },
      include: {
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      data: {
        ...statement,
        invoices,
        invoiceCount: invoices.length,
      },
    }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
