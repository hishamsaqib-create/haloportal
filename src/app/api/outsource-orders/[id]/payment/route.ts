import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params
    const body = await req.json()

    const order = await prisma.outsourceOrder.update({
      where: { id },
      data: {
        isPaid: body.isPaid ?? false,
        paidDate: body.isPaid ? new Date() : null,
        costAmount: body.costAmount ?? undefined,
      },
    })

    return NextResponse.json({ data: order })
  } catch (error) {
    return handleAuthError(error)
  }
}
