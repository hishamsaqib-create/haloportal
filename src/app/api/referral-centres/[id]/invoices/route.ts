import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const invoices = await prisma.supplierInvoice.findMany({
      where: { referralCentreId: id },
      include: {
        case: {
          select: { id: true, caseNumber: true, department: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ data: invoices })
  } catch (error) {
    return handleAuthError(error)
  }
}
