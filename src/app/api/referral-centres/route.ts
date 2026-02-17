import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    await requireAuth()
    const centres = await prisma.referralCentre.findMany({
      include: {
        _count: { select: { outsourceOrders: true, supplierInvoices: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: centres })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()

    // specialties comes as a JSON string from frontend or as an array - handle both
    let specialties: string | null = null
    if (body.specialties) {
      if (typeof body.specialties === 'string') {
        // Already a JSON string
        specialties = body.specialties
      } else if (Array.isArray(body.specialties)) {
        specialties = JSON.stringify(body.specialties)
      }
    }

    const centre = await prisma.referralCentre.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        defaultLeadTimeDays: body.defaultLeadTimeDays || 5,
        specialties,
        billingTerms: body.billingTerms || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ data: centre }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
