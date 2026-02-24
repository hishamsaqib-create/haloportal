import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string; invoiceId: string }> }

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { invoiceId } = await context.params
    const body = await req.json()

    const invoice = await prisma.supplierInvoice.update({
      where: { id: invoiceId },
      data: {
        status: body.status ?? undefined,
        paidDate: body.status === 'PAID' ? new Date() : undefined,
        paidAmount: body.paidAmount ?? undefined,
      },
    })

    return NextResponse.json({ data: invoice })
  } catch (error) {
    return handleAuthError(error)
  }
}
