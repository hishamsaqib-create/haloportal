import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth()
    const centre = await prisma.referralCentre.findUnique({
      where: { id: params.id },
      include: {
        outsourceOrders: {
          include: { case: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        supplierInvoices: { orderBy: { date: 'desc' }, take: 20 },
      },
    })
    if (!centre) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ centre })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireInternal()
    const body = await req.json()
    // specialties comes as a JSON string from frontend or as an array - handle both
    let specialties: string | undefined = undefined
    if (body.specialties !== undefined) {
      if (typeof body.specialties === 'string') {
        specialties = body.specialties
      } else if (Array.isArray(body.specialties)) {
        specialties = JSON.stringify(body.specialties)
      } else {
        specialties = undefined
      }
    }

    const centre = await prisma.referralCentre.update({
      where: { id: params.id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        defaultLeadTimeDays: body.defaultLeadTimeDays,
        specialties,
        billingTerms: body.billingTerms,
        notes: body.notes,
        active: body.active,
      },
    })
    return NextResponse.json({ centre })
  } catch (error) {
    return handleAuthError(error)
  }
}
