import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const duplicatePricingRuleSchema = z.object({
  sourceId: z.string().min(1, 'Source pricing rule ID is required'),
  variationName: z.string().min(1, 'New variation name is required'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('invoices:write')
    const body = await req.json()
    const validated = duplicatePricingRuleSchema.parse(body)

    // Find the source pricing rule
    const source = await prisma.pricingRule.findUnique({
      where: { id: validated.sourceId },
    })

    if (!source) {
      return NextResponse.json({ error: 'Source pricing rule not found' }, { status: 404 })
    }

    // Create a duplicate with the new variation name
    const duplicate = await prisma.pricingRule.create({
      data: {
        productId: source.productId,
        clinicId: source.clinicId,
        dentistId: source.dentistId,
        variationName: validated.variationName,
        price: source.price,
        minTeeth: source.minTeeth,
        additionalToothPrice: source.additionalToothPrice,
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
      entityId: duplicate.id,
      newValue: {
        duplicatedFrom: validated.sourceId,
        variationName: validated.variationName,
        price: duplicate.price,
      },
    })

    return NextResponse.json({ data: duplicate }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
