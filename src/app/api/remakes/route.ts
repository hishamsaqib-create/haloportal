import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { createRemakeSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)

    const caseId = searchParams.get('caseId')
    const reasonCode = searchParams.get('reasonCode')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (caseId) where.caseId = caseId
    if (reasonCode) where.reasonCode = reasonCode

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {}
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom)
      if (dateTo) createdAtFilter.lte = new Date(dateTo)
      where.createdAt = createdAtFilter
    }

    const [remakes, total] = await Promise.all([
      prisma.remake.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              department: true,
              clinic: { select: { id: true, name: true } },
              dentist: { select: { id: true, name: true } },
            },
          },
          caseItem: {
            select: { id: true, description: true, shade: true, material: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.remake.count({ where }),
    ])

    return NextResponse.json({
      data: remakes,
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
    const user = await requirePermission('remakes:write')
    const body = await req.json()
    const validated = createRemakeSchema.parse(body)

    // Verify case exists
    const caseData = await prisma.case.findUnique({
      where: { id: validated.caseId },
      select: { id: true, caseNumber: true },
    })
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Verify case item if provided
    if (validated.caseItemId) {
      const caseItem = await prisma.caseItem.findFirst({
        where: { id: validated.caseItemId, caseId: validated.caseId },
      })
      if (!caseItem) {
        return NextResponse.json(
          { error: 'Case item not found or does not belong to the specified case' },
          { status: 404 }
        )
      }
    }

    const remake = await prisma.remake.create({
      data: {
        caseId: validated.caseId,
        caseItemId: validated.caseItemId || null,
        reasonCode: validated.reasonCode,
        reasonText: validated.reasonText || null,
        costEstimate: validated.costEstimate ?? null,
        createdById: user.id,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
          },
        },
        caseItem: {
          select: { id: true, description: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    await createAuditLog({
      caseId: validated.caseId,
      userId: user.id,
      action: 'CREATED',
      entityType: 'Remake',
      entityId: remake.id,
      newValue: {
        reasonCode: validated.reasonCode,
        reasonText: validated.reasonText,
        caseItemId: validated.caseItemId,
        costEstimate: validated.costEstimate,
      },
    })

    return NextResponse.json({ data: remake }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
