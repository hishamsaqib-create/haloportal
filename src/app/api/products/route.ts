import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createProductSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)

    const department = searchParams.get('department')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}
    if (department) where.department = department
    if (active !== null && active !== undefined) {
      where.active = active === 'true'
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        pricingRules: {
          include: {
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { department: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ data: products })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('products:write')
    const body = await req.json()
    const validated = createProductSchema.parse(body)

    const product = await prisma.product.create({
      data: {
        department: validated.department,
        name: validated.name,
        sku: validated.sku || null,
        description: validated.description || null,
        basePrice: validated.basePrice,
        requiresToothCount: validated.requiresToothCount,
        requiresToothSelection: validated.requiresToothSelection,
        parameterSchema: validated.parameterSchema || null,
      },
      include: {
        pricingRules: true,
      },
    })

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
