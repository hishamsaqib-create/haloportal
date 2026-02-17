import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/referral-centres/[id]/rating — update the rating for a referral centre (0-10 scale)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireInternal()
    const { id } = await context.params
    const body = await req.json()

    if (body.rating === undefined || body.rating === null) {
      return NextResponse.json({ error: 'rating is required' }, { status: 400 })
    }

    const rating = Number(body.rating)
    if (isNaN(rating) || rating < 0 || rating > 10) {
      return NextResponse.json(
        { error: 'rating must be a number between 0 and 10' },
        { status: 400 }
      )
    }

    const existing = await prisma.referralCentre.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Referral centre not found' }, { status: 404 })
    }

    const centre = await prisma.referralCentre.update({
      where: { id },
      data: { rating },
    })

    return NextResponse.json({ data: centre })
  } catch (error) {
    return handleAuthError(error)
  }
}
