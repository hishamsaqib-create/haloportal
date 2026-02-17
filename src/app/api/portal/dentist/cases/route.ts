import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError, AuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()

    // This endpoint is strictly for dentist portal users
    if (user.userType !== 'DENTIST' || !user.dentistId) {
      throw new AuthError('Forbidden: Dentist portal access only', 403)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    // Always scope to this dentist's cases only
    const where: Record<string, unknown> = {
      dentistId: user.dentistId,
    }

    if (status) where.status = status
    if (department) where.department = department

    if (search) {
      where.OR = [
        { caseNumber: { contains: search } },
        { notes: { contains: search } },
        { patient: { reference: { contains: search } } },
        { patient: { initials: { contains: search } } },
      ]
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, reference: true, initials: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: [
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.case.count({ where }),
    ])

    return NextResponse.json({
      data: cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
