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
    return NextResponse.json({ centres })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()

    const centre = await prisma.referralCentre.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        defaultLeadTimeDays: body.defaultLeadTimeDays || 5,
        specialties: body.specialties ? JSON.stringify(body.specialties) : null,
        billingTerms: body.billingTerms || null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ centre }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
