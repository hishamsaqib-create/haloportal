import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { createDeliverySchema } from '@/lib/validations'
import { generateDeliveryNumber } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status')
    const clinicId = searchParams.get('clinicId')
    const method = searchParams.get('method')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (clinicId) where.clinicId = clinicId
    if (method) where.method = method

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          clinic: { select: { id: true, name: true, address: true } },
          createdBy: { select: { id: true, name: true } },
          items: {
            include: {
              case: {
                select: {
                  id: true,
                  caseNumber: true,
                  department: true,
                  status: true,
                  patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
                  dentist: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ])

    return NextResponse.json({
      data: deliveries,
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
    const user = await requirePermission('cases:status')
    const body = await req.json()
    const validated = createDeliverySchema.parse(body)

    // Verify clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: validated.clinicId },
    })
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    // Verify all cases exist, belong to this clinic, and are in READY or DISPATCHED status
    const cases = await prisma.case.findMany({
      where: {
        id: { in: validated.caseIds },
        clinicId: validated.clinicId,
      },
    })

    if (cases.length !== validated.caseIds.length) {
      return NextResponse.json(
        { error: 'One or more cases not found or do not belong to this clinic' },
        { status: 400 }
      )
    }

    // Generate unique delivery number
    let deliveryNumber = generateDeliveryNumber()
    let exists = await prisma.delivery.findUnique({ where: { deliveryNumber } })
    while (exists) {
      deliveryNumber = generateDeliveryNumber()
      exists = await prisma.delivery.findUnique({ where: { deliveryNumber } })
    }

    // Create delivery with items in a transaction
    const delivery = await prisma.$transaction(async (tx) => {
      const del = await tx.delivery.create({
        data: {
          deliveryNumber,
          clinicId: validated.clinicId,
          status: 'PENDING',
          method: validated.method || 'COURIER',
          trackingRef: validated.trackingRef || null,
          driverName: validated.driverName || null,
          notes: validated.notes || null,
          estimatedDate: validated.estimatedDate ? new Date(validated.estimatedDate) : null,
          createdById: user.id,
          items: {
            create: validated.caseIds.map((caseId) => ({
              caseId,
            })),
          },
        },
        include: {
          clinic: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          items: {
            include: {
              case: {
                select: {
                  id: true,
                  caseNumber: true,
                  department: true,
                  patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
                },
              },
            },
          },
        },
      })

      // Update all cases to DISPATCHED status
      for (const c of cases) {
        if (c.status !== 'DISPATCHED' && c.status !== 'COMPLETED') {
          await tx.case.update({
            where: { id: c.id },
            data: { status: 'DISPATCHED' },
          })
          await createAuditLog({
            caseId: c.id,
            userId: user.id,
            action: 'STATUS_CHANGE',
            entityType: 'Case',
            entityId: c.id,
            oldValue: { status: c.status },
            newValue: { status: 'DISPATCHED' },
          })
        }
      }

      return del
    })

    await createAuditLog({
      userId: user.id,
      action: 'CREATED',
      entityType: 'Delivery',
      entityId: delivery.id,
      newValue: {
        deliveryNumber,
        clinic: clinic.name,
        caseCount: validated.caseIds.length,
        method: validated.method,
      },
    })

    return NextResponse.json({ data: delivery }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
