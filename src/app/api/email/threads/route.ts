import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, scopeCaseQuery, handleAuthError } from '@/lib/rbac'

// Alias endpoint for /api/email GET - returns threads with message counts
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const caseId = searchParams.get('caseId')

    const where: Record<string, unknown> = {}
    if (caseId) where.caseId = caseId

    // Scope by case access for non-internal users
    if (user.userType !== 'INTERNAL') {
      const scopeWhere = scopeCaseQuery(user)
      where.case = scopeWhere
    }

    const threads = await prisma.emailThread.findMany({
      where,
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ data: threads })
  } catch (error) {
    return handleAuthError(error)
  }
}
