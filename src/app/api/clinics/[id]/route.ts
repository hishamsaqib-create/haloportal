import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError, AuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        dentists: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            gdcNumber: true,
            active: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            cases: true,
            invoices: true,
            dentists: true,
          },
        },
      },
    })

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    // Check access
    if (user.userType === 'CLINIC' && user.clinicId !== id) {
      throw new AuthError('Forbidden', 403)
    }
    if (user.userType === 'DENTIST' && user.clinicId !== id) {
      throw new AuthError('Forbidden', 403)
    }

    return NextResponse.json({ data: clinic })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const body = await req.json()

    // Only internal users or clinic admins of this clinic can update
    if (user.userType === 'CLINIC' && user.clinicId !== id) {
      throw new AuthError('Forbidden', 403)
    }
    if (user.userType === 'DENTIST') {
      throw new AuthError('Forbidden', 403)
    }

    const existing = await prisma.clinic.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    const allowedFields = [
      'name', 'address', 'phone', 'email',
      'billingName', 'billingAddress', 'billingEmail',
      'vatNumber', 'paymentTermDays', 'portalPassword', 'notes', 'active',
    ] as const
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const clinic = await prisma.clinic.update({
      where: { id },
      data: updateData,
      include: {
        dentists: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            cases: true,
            invoices: true,
            dentists: true,
          },
        },
      },
    })

    return NextResponse.json({ data: clinic })
  } catch (error) {
    return handleAuthError(error)
  }
}
