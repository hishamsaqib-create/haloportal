import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError, AuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        clinic: true,
        dentist: true,
        lines: {
          include: {
            case: { select: { id: true, caseNumber: true, department: true } },
            caseItem: { select: { id: true, description: true, shade: true, material: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check access
    if (user.userType === 'CLINIC' && user.clinicId !== invoice.clinicId) {
      throw new AuthError('Forbidden', 403)
    }
    if (user.userType === 'DENTIST' && user.dentistId !== invoice.dentistId) {
      throw new AuthError('Forbidden', 403)
    }

    return NextResponse.json({ data: invoice })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('invoices:write')
    const { id } = await context.params
    const body = await req.json()

    const existing = await prisma.invoice.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const oldStatus = existing.status

    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['SENT', 'CANCELLED'],
        SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
        OVERDUE: ['PAID', 'CANCELLED'],
      }

      const allowed = validTransitions[existing.status]
      if (!allowed || !allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Cannot transition from '${existing.status}' to '${body.status}'` },
          { status: 400 }
        )
      }
      updateData.status = body.status

      if (body.status === 'PAID') {
        updateData.paidDate = new Date()
      }
    }

    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
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

    if (body.status && body.status !== oldStatus) {
      await createAuditLog({
        userId: user.id,
        action: 'STATUS_CHANGE',
        entityType: 'Invoice',
        entityId: id,
        oldValue: { status: oldStatus },
        newValue: { status: body.status },
      })
    }

    return NextResponse.json({ data: invoice })
  } catch (error) {
    return handleAuthError(error)
  }
}
