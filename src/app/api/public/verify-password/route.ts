import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 })
    }

    // Check against per-dentist portal passwords
    const dentist = await prisma.dentist.findFirst({
      where: {
        portalPassword: password,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        clinicId: true,
        allowCeramics: true,
        allowDsd: true,
        allowAppliances: true,
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (dentist) {
      return NextResponse.json({
        success: true,
        dentist: {
          id: dentist.id,
          name: dentist.name,
          email: dentist.email,
          clinicId: dentist.clinicId,
          clinicName: dentist.clinic.name,
          allowCeramics: dentist.allowCeramics,
          allowDsd: dentist.allowDsd,
          allowAppliances: dentist.allowAppliances,
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
