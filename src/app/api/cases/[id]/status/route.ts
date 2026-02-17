import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError, AuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { DEPARTMENT_STATUSES, type Department, type CaseStatus } from '@/lib/constants'
import { updateCaseStatusSchema } from '@/lib/validations'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('cases:status')
    const { id } = await context.params
    const body = await req.json()
    const validated = updateCaseStatusSchema.parse(body)

    const existingCase = await prisma.case.findUnique({ where: { id } })
    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Validate status is allowed for the case's department
    const department = existingCase.department as Department
    const allowedStatuses = DEPARTMENT_STATUSES[department]
    if (!allowedStatuses || !allowedStatuses.includes(validated.status as CaseStatus)) {
      return NextResponse.json(
        {
          error: `Status '${validated.status}' is not valid for department '${department}'`,
          allowedStatuses,
        },
        { status: 400 }
      )
    }

    // If moving to SENT_OUTSOURCE, verify an outsource order exists
    if (validated.status === 'SENT_OUTSOURCE') {
      const outsourceOrder = await prisma.outsourceOrder.findFirst({
        where: { caseId: id },
      })
      if (!outsourceOrder) {
        return NextResponse.json(
          { error: 'Cannot set status to SENT_OUTSOURCE without an outsource order. Create an outsource order first.' },
          { status: 400 }
        )
      }
    }

    const oldStatus = existingCase.status
    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        status: validated.status,
        notes: validated.notes !== undefined
          ? (validated.notes || existingCase.notes)
          : existingCase.notes,
      },
      include: {
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
        patient: { select: { id: true, reference: true, initials: true } },
        items: true,
      },
    })

    await createAuditLog({
      caseId: id,
      userId: user.id,
      action: 'STATUS_CHANGE',
      entityType: 'Case',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: validated.status },
    })

    return NextResponse.json({ data: updatedCase })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
