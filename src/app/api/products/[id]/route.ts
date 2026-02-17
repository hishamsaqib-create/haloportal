import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { id } = await context.params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        pricingRules: {
          include: {
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ data: product })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requirePermission('products:write')
    const { id } = await context.params
    const body = await req.json()

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const allowedFields = [
      'department', 'name', 'sku', 'description', 'basePrice',
      'requiresToothCount', 'requiresToothSelection', 'parameterSchema', 'active',
    ] as const
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        pricingRules: {
          include: {
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({ data: product })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await requirePermission('products:write')
    const { id } = await context.params

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Soft delete by deactivating
    const product = await prisma.product.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ data: product })
  } catch (error) {
    return handleAuthError(error)
  }
}
