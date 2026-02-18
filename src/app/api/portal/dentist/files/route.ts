import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await requireAuth()

    if (user.userType !== 'DENTIST' || !user.dentistId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get dentist's clinic ID
    const dentist = await prisma.dentist.findUnique({
      where: { id: user.dentistId },
      select: { clinicId: true },
    })

    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    // Get all files shared with dentist from their clinic's cases
    const files = await prisma.caseFile.findMany({
      where: {
        sharedWithDentist: true,
        case: {
          dentistId: user.dentistId,
        },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            status: true,
            patient: { select: { initials: true, reference: true } },
          },
        },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: files })
  } catch (error) {
    return handleAuthError(error)
  }
}
