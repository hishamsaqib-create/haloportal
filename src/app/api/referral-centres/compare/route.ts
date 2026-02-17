import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

// GET /api/referral-centres/compare?item=Porcelain+Veneer — compare pricing across centres for a given item
export async function GET(req: NextRequest) {
  try {
    await requireAuth()

    const item = req.nextUrl.searchParams.get('item')
    if (!item) {
      return NextResponse.json(
        { error: 'item query parameter is required' },
        { status: 400 }
      )
    }

    const pricing = await prisma.referralCentrePricing.findMany({
      where: { itemName: item },
      include: {
        referralCentre: {
          select: {
            id: true,
            name: true,
            rating: true,
            active: true,
          },
        },
      },
      orderBy: { costPerUnit: 'asc' },
    })

    // Only include results from active centres
    const results = pricing
      .filter((p) => p.referralCentre.active)
      .map((p) => ({
        centreId: p.referralCentre.id,
        centreName: p.referralCentre.name,
        centreRating: p.referralCentre.rating,
        itemName: p.itemName,
        itemCategory: p.itemCategory,
        costPerUnit: p.costPerUnit,
        currency: p.currency,
        notes: p.notes,
        updatedAt: p.updatedAt,
      }))

    return NextResponse.json({ data: results })
  } catch (error) {
    return handleAuthError(error)
  }
}
