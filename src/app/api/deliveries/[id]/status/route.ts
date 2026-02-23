import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { updateDeliveryStatusSchema } from '@/lib/validations'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('cases:status')
    const { id } = await context.params
    const body = await req.json()
    const validated = updateDeliveryStatusSchema.parse(body)

    const existing = await prisma.delivery.findUnique({
      where: { id },
      include: {
        items: { include: { case: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    const oldStatus = existing.status
    const updateData: Record<string, unknown> = {
      status: validated.status,
    }

    // Set timestamps based on status
    if (validated.status === 'COLLECTED' || validated.status === 'IN_TRANSIT') {
      if (!existing.dispatchedAt) {
        updateData.dispatchedAt = new Date()
      }
    }
    if (validated.status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
      if (!existing.dispatchedAt) {
        updateData.dispatchedAt = new Date()
      }
    }

    if (validated.notes) {
      updateData.notes = validated.notes
    }

    const delivery = await prisma.$transaction(async (tx) => {
      const del = await tx.delivery.update({
        where: { id },
        data: updateData,
        include: {
          clinic: { select: { id: true, name: true } },
          items: {
            include: {
              case: {
                select: { id: true, caseNumber: true, department: true, status: true },
              },
            },
          },
        },
      })

      // When delivered, mark all cases as COMPLETED
      if (validated.status === 'DELIVERED') {
        for (const item of existing.items) {
          if (item.case.status !== 'COMPLETED' && item.case.status !== 'CANCELLED') {
            await tx.case.update({
              where: { id: item.caseId },
              data: { status: 'COMPLETED' },
            })
            await createAuditLog({
              caseId: item.caseId,
              userId: user.id,
              action: 'STATUS_CHANGE',
              entityType: 'Case',
              entityId: item.caseId,
              oldValue: { status: item.case.status },
              newValue: { status: 'COMPLETED' },
            })
          }
        }
      }

      return del
    })

    await createAuditLog({
      userId: user.id,
      action: 'STATUS_CHANGE',
      entityType: 'Delivery',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: validated.status },
    })

    return NextResponse.json({ data: delivery })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
