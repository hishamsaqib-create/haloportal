import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 })
    }

    // Check against per-clinic portal passwords
    const clinic = await prisma.clinic.findFirst({
      where: {
        portalPassword: password,
        active: true,
      },
      select: {
        id: true,
        name: true,
        dentists: {
          where: { active: true },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (clinic) {
      return NextResponse.json({
        success: true,
        clinic: {
          id: clinic.id,
          name: clinic.name,
          dentists: clinic.dentists,
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
