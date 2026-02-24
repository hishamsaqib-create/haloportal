import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const clinicId = searchParams.get('clinicId')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    // Scope by user type
    if (user.userType === 'CLINIC') {
      where.clinicId = user.clinicId!
    } else if (user.userType === 'DENTIST') {
      // Dentist can only see themselves
      where.id = user.dentistId!
    } else {
      // Internal users can filter by clinic
      if (clinicId) where.clinicId = clinicId
    }

    if (active !== null && active !== undefined) {
      where.active = active === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { gdcNumber: { contains: search } },
      ]
    }

    const dentists = await prisma.dentist.findMany({
      where,
      include: {
        clinic: { select: { id: true, name: true } },
        _count: {
          select: {
            cases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: dentists })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()

    const { clinicId, name, email, phone, gdcNumber, paymentTermDays, portalPassword, allowCeramics, allowDsd, allowAppliances, notes } = body

    if (!clinicId || !name) {
      return NextResponse.json(
        { error: 'clinicId and name are required' },
        { status: 400 }
      )
    }

    // Verify clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
    })
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    const dentist = await prisma.dentist.create({
      data: {
        clinicId,
        name,
        email: email || null,
        phone: phone || null,
        gdcNumber: gdcNumber || null,
        paymentTermDays: paymentTermDays ?? null,
        notes: notes || null,
        portalPassword: portalPassword || null,
        allowCeramics: allowCeramics !== undefined ? allowCeramics : true,
        allowDsd: allowDsd !== undefined ? allowDsd : true,
        allowAppliances: allowAppliances !== undefined ? allowAppliances : true,
        active: true,
      },
      include: {
        clinic: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ data: dentist }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
