import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dentistId = searchParams.get('dentistId')

    if (!dentistId) {
      return NextResponse.json({ error: 'dentistId required' }, { status: 400 })
    }

    // Verify the dentist exists and is active
    const dentist = await prisma.dentist.findUnique({
      where: { id: dentistId, active: true },
      select: { id: true },
    })

    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    const cases = await prisma.case.findMany({
      where: { dentistId },
      select: {
        id: true,
        caseNumber: true,
        department: true,
        status: true,
        dueDate: true,
        createdAt: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            initials: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ data: cases })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
