import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError, AuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const dentist = await prisma.dentist.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true } },
        _count: { select: { cases: true } },
      },
    })

    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    if (user.userType === 'DENTIST' && user.dentistId !== id) {
      throw new AuthError('Forbidden', 403)
    }
    if (user.userType === 'CLINIC' && user.clinicId !== dentist.clinicId) {
      throw new AuthError('Forbidden', 403)
    }

    return NextResponse.json({ data: dentist })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params
    const body = await req.json()

    const existing = await prisma.dentist.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    const allowedFields = ['name', 'email', 'phone', 'gdcNumber', 'paymentTermDays', 'portalPassword', 'notificationChannel', 'notes', 'active'] as const
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const dentist = await prisma.dentist.update({
      where: { id },
      data: updateData,
      include: {
        clinic: { select: { id: true, name: true } },
        _count: { select: { cases: true } },
      },
    })

    return NextResponse.json({ data: dentist })
  } catch (error) {
    return handleAuthError(error)
  }
}
