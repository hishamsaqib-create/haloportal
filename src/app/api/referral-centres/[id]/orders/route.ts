import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const orders = await prisma.outsourceOrder.findMany({
      where: { referralCentreId: id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            status: true,
            dueDate: true,
            patient: { select: { firstName: true, lastName: true, initials: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: orders })
  } catch (error) {
    return handleAuthError(error)
  }
}
