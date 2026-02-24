import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { z } from 'zod'

const VAT_ENABLED_KEY = 'vat_enabled'
const VAT_RATE_KEY = 'vat_rate'

const updateVatSchema = z.object({
  enabled: z.boolean(),
  rate: z.number().min(0).max(100).optional(),
})

export async function GET() {
  try {
    await requireAuth()

    const [enabledSetting, rateSetting] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: VAT_ENABLED_KEY } }),
      prisma.systemSettings.findUnique({ where: { key: VAT_RATE_KEY } }),
    ])

    const enabled = enabledSetting?.value !== 'false' // Default to enabled
    const rate = rateSetting ? parseFloat(rateSetting.value) : 20

    return NextResponse.json({
      data: {
        enabled,
        rate,
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireInternal()
    const body = await req.json()
    const validated = updateVatSchema.parse(body)

    const rate = validated.rate ?? 20

    // Get old values for audit
    const [oldEnabled, oldRate] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: VAT_ENABLED_KEY } }),
      prisma.systemSettings.findUnique({ where: { key: VAT_RATE_KEY } }),
    ])

    // Upsert both settings
    await Promise.all([
      prisma.systemSettings.upsert({
        where: { key: VAT_ENABLED_KEY },
        update: { value: String(validated.enabled) },
        create: {
          key: VAT_ENABLED_KEY,
          value: String(validated.enabled),
          label: 'VAT Enabled',
          category: 'billing',
        },
      }),
      prisma.systemSettings.upsert({
        where: { key: VAT_RATE_KEY },
        update: { value: String(rate) },
        create: {
          key: VAT_RATE_KEY,
          value: String(rate),
          label: 'Default VAT Rate (%)',
          category: 'billing',
        },
      }),
    ])

    await createAuditLog({
      userId: user.id,
      action: 'UPDATED',
      entityType: 'SystemSettings',
      entityId: 'vat',
      oldValue: {
        enabled: oldEnabled?.value !== 'false',
        rate: oldRate ? parseFloat(oldRate.value) : 20,
      },
      newValue: {
        enabled: validated.enabled,
        rate,
      },
    })

    return NextResponse.json({
      data: {
        enabled: validated.enabled,
        rate,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
