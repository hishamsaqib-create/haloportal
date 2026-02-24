import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const createPricingRuleSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  clinicId: z.string().optional().nullable(),
  dentistId: z.string().optional().nullable(),
  variationName: z.string().optional().nullable(),
  price: z.number().min(0, 'Price must be non-negative'),
  minTeeth: z.number().int().min(1).optional().nullable(),
  additionalToothPrice: z.number().min(0).optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)

    const productId = searchParams.get('productId')
    const dentistId = searchParams.get('dentistId')
    const clinicId = searchParams.get('clinicId')
    const variationName = searchParams.get('variationName')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (productId) where.productId = productId
    if (dentistId) where.dentistId = dentistId
    if (clinicId) where.clinicId = clinicId
    if (variationName) where.variationName = variationName

    const [rules, total] = await Promise.all([
      prisma.pricingRule.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, department: true, basePrice: true } },
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
        },
        orderBy: [{ variationName: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.pricingRule.count({ where }),
    ])

    return NextResponse.json({
      data: rules,
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

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('invoices:write')
    const body = await req.json()
    const validated = createPricingRuleSchema.parse(body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const rule = await prisma.pricingRule.create({
      data: {
        productId: validated.productId,
        clinicId: validated.clinicId || null,
        dentistId: validated.dentistId || null,
        variationName: validated.variationName || null,
        price: validated.price,
        minTeeth: validated.minTeeth ?? null,
        additionalToothPrice: validated.additionalToothPrice ?? null,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
      },
    })

    await createAuditLog({
      userId: user.id,
      action: 'CREATED',
      entityType: 'PricingRule',
      entityId: rule.id,
      newValue: {
        productId: validated.productId,
        variationName: validated.variationName,
        price: validated.price,
        minTeeth: validated.minTeeth,
        additionalToothPrice: validated.additionalToothPrice,
      },
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
