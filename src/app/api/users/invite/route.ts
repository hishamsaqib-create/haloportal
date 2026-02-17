import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'
import { inviteUserSchema } from '@/lib/validations'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const user = await requireInternal()
    const body = await req.json()
    const validated = inviteUserSchema.parse(body)

    // Check if an active invite already exists for this email
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        email: validated.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    })
    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invite already exists for this email' },
        { status: 409 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')

    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.userInvite.create({
      data: {
        email: validated.email,
        userType: validated.userType,
        role: validated.role,
        clinicId: validated.clinicId || null,
        dentistId: validated.dentistId || null,
        token,
        expiresAt,
        createdById: user.id,
      },
      select: {
        id: true,
        email: true,
        userType: true,
        role: true,
        token: true,
        expiresAt: true,
        clinicId: true,
        dentistId: true,
        createdAt: true,
      },
    })

    // MVP: Don't actually send an email, just return the invite with the token
    // The token can be used to construct an invite URL:
    // e.g., ${process.env.NEXTAUTH_URL}/auth/accept-invite?token=${token}

    return NextResponse.json({
      data: {
        ...invite,
        inviteUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/accept-invite?token=${token}`,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
