import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    await requireInternal()
    const { searchParams } = new URL(req.url)

    const userType = searchParams.get('userType')
    const role = searchParams.get('role')
    const clinicId = searchParams.get('clinicId')
    const active = searchParams.get('active')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (userType) where.userType = userType
    if (role) where.role = role
    if (clinicId) where.clinicId = clinicId
    if (active !== null && active !== undefined) {
      where.active = active === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          userType: true,
          role: true,
          active: true,
          lastLogin: true,
          clinicId: true,
          dentistId: true,
          createdAt: true,
          updatedAt: true,
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      data: users,
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
    await requireInternal()
    const body = await req.json()

    const { email, name, password, userType, role, clinicId, dentistId } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'email, name, and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        userType: userType || 'INTERNAL',
        role: role || 'LAB_STAFF',
        clinicId: clinicId || null,
        dentistId: dentistId || null,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        role: true,
        active: true,
        clinicId: true,
        dentistId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
