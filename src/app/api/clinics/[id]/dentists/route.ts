import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    // Check access
    if (user.userType === 'CLINIC' && user.clinicId !== id) {
      throw new AuthError('Forbidden', 403)
    }
    if (user.userType === 'DENTIST' && user.clinicId !== id) {
      throw new AuthError('Forbidden', 403)
    }

    const dentists = await prisma.dentist.findMany({
      where: { clinicId: id, active: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gdcNumber: true,
        clinicId: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: dentists })
  } catch (error) {
    return handleAuthError(error)
  }
}
