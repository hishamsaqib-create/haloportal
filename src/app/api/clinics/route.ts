import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const search = searchParams.get('search')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}

    // Non-internal users can only see their own clinic
    if (user.userType === 'CLINIC') {
      where.id = user.clinicId!
    } else if (user.userType === 'DENTIST') {
      // Dentist can see their associated clinic
      if (user.clinicId) {
        where.id = user.clinicId
      } else {
        return NextResponse.json({ data: [] })
      }
    }

    if (active !== null && active !== undefined) {
      where.active = active === 'true'
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const clinics = await prisma.clinic.findMany({
      where,
      include: {
        _count: {
          select: {
            dentists: true,
            cases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: clinics })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()

    const { name, address, phone, email, billingName, billingAddress, billingEmail, vatNumber, paymentTermDays, portalPassword, notes } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const clinic = await prisma.clinic.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        billingName: billingName || null,
        billingAddress: billingAddress || null,
        billingEmail: billingEmail || null,
        vatNumber: vatNumber || null,
        paymentTermDays: paymentTermDays ?? 30,
        portalPassword: portalPassword || null,
        notes: notes || null,
        active: true,
      },
      include: {
        _count: {
          select: {
            dentists: true,
            cases: true,
          },
        },
      },
    })

    return NextResponse.json({ data: clinic }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
