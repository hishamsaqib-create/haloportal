import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/referral-centres/[id]/pricing — list all pricing items for a referral centre
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const centre = await prisma.referralCentre.findUnique({ where: { id } })
    if (!centre) {
      return NextResponse.json({ error: 'Referral centre not found' }, { status: 404 })
    }

    const pricing = await prisma.referralCentrePricing.findMany({
      where: { referralCentreId: id },
      orderBy: { itemName: 'asc' },
    })

    return NextResponse.json({ data: pricing })
  } catch (error) {
    return handleAuthError(error)
  }
}

// POST /api/referral-centres/[id]/pricing — add a new pricing item
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params
    const body = await req.json()

    const centre = await prisma.referralCentre.findUnique({ where: { id } })
    if (!centre) {
      return NextResponse.json({ error: 'Referral centre not found' }, { status: 404 })
    }

    if (!body.itemName || body.costPerUnit === undefined) {
      return NextResponse.json(
        { error: 'itemName and costPerUnit are required' },
        { status: 400 }
      )
    }

    const pricing = await prisma.referralCentrePricing.create({
      data: {
        referralCentreId: id,
        itemName: body.itemName,
        itemCategory: body.itemCategory || null,
        costPerUnit: body.costPerUnit,
        currency: body.currency || 'GBP',
        notes: body.notes || null,
      },
    })

    return NextResponse.json({ data: pricing }, { status: 201 })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A pricing item with this name already exists for this centre' },
        { status: 409 }
      )
    }
    return handleAuthError(error)
  }
}

// PUT /api/referral-centres/[id]/pricing — update a pricing item (requires pricingId in body)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params
    const body = await req.json()

    if (!body.pricingId) {
      return NextResponse.json({ error: 'pricingId is required' }, { status: 400 })
    }

    const existing = await prisma.referralCentrePricing.findFirst({
      where: { id: body.pricingId, referralCentreId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Pricing item not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.itemName !== undefined) updateData.itemName = body.itemName
    if (body.itemCategory !== undefined) updateData.itemCategory = body.itemCategory
    if (body.costPerUnit !== undefined) updateData.costPerUnit = body.costPerUnit
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.notes !== undefined) updateData.notes = body.notes

    const pricing = await prisma.referralCentrePricing.update({
      where: { id: body.pricingId },
      data: updateData,
    })

    return NextResponse.json({ data: pricing })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A pricing item with this name already exists for this centre' },
        { status: 409 }
      )
    }
    return handleAuthError(error)
  }
}

// DELETE /api/referral-centres/[id]/pricing — delete a pricing item (requires pricingId in body)
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params
    const body = await req.json()

    if (!body.pricingId) {
      return NextResponse.json({ error: 'pricingId is required' }, { status: 400 })
    }

    const existing = await prisma.referralCentrePricing.findFirst({
      where: { id: body.pricingId, referralCentreId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Pricing item not found' }, { status: 404 })
    }

    await prisma.referralCentrePricing.delete({
      where: { id: body.pricingId },
    })

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    return handleAuthError(error)
  }
}
