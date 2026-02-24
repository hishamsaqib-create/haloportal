import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().min(1, 'Pricing rule ID is required'),
      price: z.number().min(0, 'Price must be non-negative'),
      minTeeth: z.number().int().min(1).optional().nullable(),
      additionalToothPrice: z.number().min(0).optional().nullable(),
    })
  ).min(1, 'At least one update is required'),
})

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission('invoices:write')
    const body = await req.json()
    const validated = bulkUpdateSchema.parse(body)

    const results = []
    const errors = []

    for (const update of validated.updates) {
      try {
        // Fetch old value for audit log
        const oldRule = await prisma.pricingRule.findUnique({
          where: { id: update.id },
        })

        if (!oldRule) {
          errors.push({ id: update.id, error: 'Pricing rule not found' })
          continue
        }

        const data: Record<string, unknown> = { price: update.price }
        if (update.minTeeth !== undefined) data.minTeeth = update.minTeeth ?? null
        if (update.additionalToothPrice !== undefined) data.additionalToothPrice = update.additionalToothPrice ?? null

        const updated = await prisma.pricingRule.update({
          where: { id: update.id },
          data,
          include: {
            product: { select: { id: true, name: true, sku: true } },
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
          },
        })

        await createAuditLog({
          userId: user.id,
          action: 'UPDATED',
          entityType: 'PricingRule',
          entityId: update.id,
          oldValue: { price: oldRule.price, minTeeth: oldRule.minTeeth, additionalToothPrice: oldRule.additionalToothPrice },
          newValue: { price: update.price, minTeeth: update.minTeeth, additionalToothPrice: update.additionalToothPrice },
        })

        results.push(updated)
      } catch (err) {
        errors.push({ id: update.id, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    return NextResponse.json({
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        updated: results.length,
        failed: errors.length,
        total: validated.updates.length,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
