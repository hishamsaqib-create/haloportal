import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true, address: true, phone: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          include: {
            case: {
              select: {
                id: true,
                caseNumber: true,
                department: true,
                status: true,
                priority: true,
                dueDate: true,
                patient: { select: { id: true, reference: true, initials: true } },
                dentist: { select: { id: true, name: true } },
                items: { select: { id: true, description: true, qty: true, lineTotal: true } },
              },
            },
          },
        },
      },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    return NextResponse.json({ data: delivery })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('cases:status')
    const { id } = await context.params
    const body = await req.json()

    const existing = await prisma.delivery.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.method !== undefined) updateData.method = body.method
    if (body.trackingRef !== undefined) updateData.trackingRef = body.trackingRef
    if (body.driverName !== undefined) updateData.driverName = body.driverName
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.estimatedDate !== undefined) updateData.estimatedDate = body.estimatedDate ? new Date(body.estimatedDate) : null

    const delivery = await prisma.delivery.update({
      where: { id },
      data: updateData,
      include: {
        clinic: { select: { id: true, name: true } },
        items: {
          include: {
            case: {
              select: { id: true, caseNumber: true, department: true },
            },
          },
        },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'UPDATED',
      entityType: 'Delivery',
      entityId: id,
      oldValue: existing,
      newValue: updateData,
    })

    return NextResponse.json({ data: delivery })
  } catch (error) {
    return handleAuthError(error)
  }
}
