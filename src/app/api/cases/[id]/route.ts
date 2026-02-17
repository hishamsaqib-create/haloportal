import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError, AuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        clinic: true,
        dentist: true,
        patient: true,
        items: {
          include: {
            product: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        outsourceOrders: {
          include: {
            referralCentre: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        emailThreads: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        remakes: {
          include: {
            caseItem: { select: { id: true, description: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        prescriptions: {
          include: {
            generatedBy: { select: { id: true, name: true } },
          },
          orderBy: { version: 'desc' },
        },
        auditLogs: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Check access based on user type
    if (user.userType === 'CLINIC' && user.clinicId !== caseData.clinicId) {
      throw new AuthError('Forbidden', 403)
    }
    if (user.userType === 'DENTIST' && user.dentistId !== caseData.dentistId) {
      throw new AuthError('Forbidden', 403)
    }

    return NextResponse.json({ data: caseData })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('cases:write')
    const { id } = await context.params
    const body = await req.json()

    const existingCase = await prisma.case.findUnique({ where: { id } })
    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Build update data from allowed fields
    const allowedFields = [
      'clinicId', 'dentistId', 'patientId', 'department',
      'priority', 'dueDate', 'notes', 'externalRef',
    ] as const
    const updateData: Record<string, unknown> = {}
    const changes: Record<string, { old: unknown; new: unknown }> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldVal = existingCase[field as keyof typeof existingCase]
        const newVal = field === 'dueDate' && body[field] ? new Date(body[field]) : body[field]
        updateData[field] = newVal
        if (String(oldVal) !== String(newVal)) {
          changes[field] = { old: oldVal, new: newVal }
        }
      }
    }

    // Handle status change separately for specific audit logging
    if (body.status && body.status !== existingCase.status) {
      updateData.status = body.status
      changes.status = { old: existingCase.status, new: body.status }

      await createAuditLog({
        caseId: id,
        userId: user.id,
        action: 'STATUS_CHANGE',
        entityType: 'Case',
        entityId: id,
        oldValue: { status: existingCase.status },
        newValue: { status: body.status },
      })
    }

    const updatedCase = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
        patient: { select: { id: true, reference: true, initials: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    })

    // Create general update audit log if there are non-status changes
    const nonStatusChanges = { ...changes }
    delete nonStatusChanges.status
    if (Object.keys(nonStatusChanges).length > 0) {
      await createAuditLog({
        caseId: id,
        userId: user.id,
        action: 'UPDATED',
        entityType: 'Case',
        entityId: id,
        oldValue: Object.fromEntries(
          Object.entries(nonStatusChanges).map(([k, v]) => [k, v.old])
        ),
        newValue: Object.fromEntries(
          Object.entries(nonStatusChanges).map(([k, v]) => [k, v.new])
        ),
      })
    }

    return NextResponse.json({ data: updatedCase })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requirePermission('cases:write')
    const { id } = await context.params

    const existingCase = await prisma.case.findUnique({ where: { id } })
    if (!existingCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Soft delete: set status to CANCELLED
    const cancelledCase = await prisma.case.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    await createAuditLog({
      caseId: id,
      userId: user.id,
      action: 'DELETED',
      entityType: 'Case',
      entityId: id,
      oldValue: { status: existingCase.status },
      newValue: { status: 'CANCELLED' },
    })

    return NextResponse.json({ data: cancelledCase })
  } catch (error) {
    return handleAuthError(error)
  }
}
