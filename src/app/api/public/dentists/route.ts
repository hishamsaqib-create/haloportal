import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const dentists = await prisma.dentist.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: dentists })
  } catch {
    return NextResponse.json({ error: 'Failed to load dentists' }, { status: 500 })
  }
}
