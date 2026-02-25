import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

const DEFAULT_SETTINGS: Record<string, { value: string; label: string; category: string }> = {
  vat_enabled: { value: 'true', label: 'VAT Enabled', category: 'billing' },
  vat_rate: { value: '20', label: 'Default VAT Rate (%)', category: 'billing' },
  payment_terms_days: { value: '30', label: 'Default Payment Terms (days)', category: 'billing' },
  currency: { value: 'GBP', label: 'Default Currency', category: 'billing' },
  invoice_number_format: { value: 'INV-YYYYMM-XXXX', label: 'Invoice Number Format', category: 'general' },
  lab_name: { value: 'Halo Dental Lab', label: 'Lab Name', category: 'general' },
  lab_email: { value: 'lab@halolab.co.uk', label: 'Lab Email', category: 'branding' },
  lab_phone: { value: '', label: 'Lab Phone', category: 'branding' },
  lab_address: { value: '', label: 'Lab Address', category: 'branding' },
  whatsapp_phone_id: { value: '', label: 'WhatsApp Phone Number ID', category: 'integrations' },
  whatsapp_access_token: { value: '', label: 'WhatsApp Access Token', category: 'integrations' },
  whatsapp_verify_token: { value: '', label: 'WhatsApp Webhook Verify Token', category: 'integrations' },
  whatsapp_business_id: { value: '', label: 'WhatsApp Business Account ID', category: 'integrations' },
  monday_api_key: { value: '', label: 'Monday.com API Key', category: 'integrations' },
  monday_board_id: { value: '', label: 'Monday.com Board ID', category: 'integrations' },
}

export async function GET() {
  try {
    await requireAuth()
    const settings = await prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    })

    // Merge with defaults
    const merged: Record<string, { key: string; value: string; label: string; category: string }> = {}
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      const saved = settings.find((s) => s.key === key)
      merged[key] = {
        key,
        value: saved?.value ?? def.value,
        label: saved?.label ?? def.label,
        category: saved?.category ?? def.category,
      }
    }
    // Include any additional saved settings not in defaults
    for (const s of settings) {
      if (!merged[s.key]) {
        merged[s.key] = { key: s.key, value: s.value, label: s.label || s.key, category: s.category }
      }
    }

    return NextResponse.json({ data: merged })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()
    const { settings } = body as { settings: Record<string, string> }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 })
    }

    const results = []
    for (const [key, value] of Object.entries(settings)) {
      const def = DEFAULT_SETTINGS[key]
      const result = await prisma.systemSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          label: def?.label || key,
          category: def?.category || 'general',
        },
      })
      results.push(result)
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    return handleAuthError(error)
  }
}
