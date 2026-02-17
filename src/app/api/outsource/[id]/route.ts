import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { OUTSOURCE_STATUSES } from '@/lib/constants'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const order = await prisma.outsourceOrder.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            status: true,
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
            patient: { select: { id: true, reference: true, initials: true } },
            items: {
              include: {
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
        referralCentre: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Outsource order not found' }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('outsource:write')
    const { id } = await context.params
    const body = await req.json()

    const existing = await prisma.outsourceOrder.findUnique({
      where: { id },
      include: {
        case: { select: { id: true, caseNumber: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Outsource order not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const oldStatus = existing.status

    if (body.status) {
      if (!OUTSOURCE_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status '${body.status}'. Valid: ${OUTSOURCE_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = body.status

      // Set actual return date when received
      if (body.status === 'RECEIVED') {
        updateData.actualReturnDate = new Date()
        // Also update the case status to RECEIVED
        await prisma.case.update({
          where: { id: existing.caseId },
          data: { status: 'RECEIVED' },
        })
      }
    }

    if (body.trackingRef !== undefined) updateData.trackingRef = body.trackingRef
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.expectedReturnDate) updateData.expectedReturnDate = new Date(body.expectedReturnDate)

    const order = await prisma.outsourceOrder.update({
      where: { id },
      data: updateData,
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            patient: { select: { id: true, reference: true, initials: true } },
          },
        },
        referralCentre: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (body.status && body.status !== oldStatus) {
      await createAuditLog({
        caseId: existing.caseId,
        userId: user.id,
        action: 'STATUS_CHANGE',
        entityType: 'OutsourceOrder',
        entityId: id,
        oldValue: { status: oldStatus },
        newValue: { status: body.status },
      })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    return handleAuthError(error)
  }
}
