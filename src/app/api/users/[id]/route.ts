import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        role: true,
        active: true,
        lastLogin: true,
        createdAt: true,
        clinicId: true,
        dentistId: true,
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ data: user })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params
    const body = await req.json()

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.email !== undefined) updateData.email = body.email
    if (body.active !== undefined) updateData.active = body.active
    if (body.role !== undefined) updateData.role = body.role
    if (body.userType !== undefined) updateData.userType = body.userType
    if (body.clinicId !== undefined) updateData.clinicId = body.clinicId || null
    if (body.dentistId !== undefined) updateData.dentistId = body.dentistId || null

    // Password setting
    if (body.password && body.password.length >= 6) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        role: true,
        active: true,
        lastLogin: true,
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ data: user })
  } catch (error) {
    return handleAuthError(error)
  }
}
