import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { resolvePrice, calculateLineTotal } from '@/lib/pricing'
import { syncCaseToMonday } from '@/lib/monday'

// Known Jotform field name mappings
const FIELD_MAP: Record<string, string> = {
  // Clinic / dentist identification
  'clinicName': 'clinicName',
  'clinic_name': 'clinicName',
  'clinic': 'clinicName',
  'dentistName': 'dentistName',
  'dentist_name': 'dentistName',
  'dentist': 'dentistName',

  // Patient fields
  'patientRef': 'patientRef',
  'patient_ref': 'patientRef',
  'patient_reference': 'patientRef',
  'patientInitials': 'patientInitials',
  'patient_initials': 'patientInitials',
  'patientName': 'patientName',
  'patient_name': 'patientName',
  'patientFirstName': 'patientFirstName',
  'patient_first_name': 'patientFirstName',
  'patientLastName': 'patientLastName',
  'patient_last_name': 'patientLastName',

  // Case fields
  'department': 'department',
  'priority': 'priority',
  'dueDate': 'dueDate',
  'due_date': 'dueDate',
  'notes': 'notes',
  'special_instructions': 'notes',

  // Item fields
  'product': 'productName',
  'product_name': 'productName',
  'shade': 'shade',
  'material': 'material',
  'teeth': 'toothNumbers',
  'tooth_numbers': 'toothNumbers',
  'quantity': 'qty',
  'qty': 'qty',
}

function normalizeFieldName(name: string): string {
  const lower = name.toLowerCase().trim()
  return FIELD_MAP[lower] || FIELD_MAP[name] || name
}

interface ParsedFormData {
  clinicName?: string
  dentistName?: string
  patientRef?: string
  patientInitials?: string
  patientName?: string
  patientFirstName?: string
  patientLastName?: string
  department?: string
  priority?: string
  dueDate?: string
  notes?: string
  productName?: string
  shade?: string
  material?: string
  toothNumbers?: string
  qty?: string
  [key: string]: string | undefined
}

function parseFormFields(body: Record<string, unknown>): ParsedFormData {
  const result: ParsedFormData = {}

  // Handle rawRequest (Jotform sends data as rawRequest JSON string)
  let fields = body
  if (body.rawRequest && typeof body.rawRequest === 'string') {
    try {
      fields = JSON.parse(body.rawRequest)
    } catch {
      fields = body
    }
  }

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.trim()) {
      const normalized = normalizeFieldName(key)
      result[normalized] = value.trim()
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested Jotform field objects (e.g., { first: "...", last: "..." })
      const nested = value as Record<string, string>
      if (nested.answer) {
        const normalized = normalizeFieldName(key)
        result[normalized] = String(nested.answer).trim()
      }
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.JOTFORM_WEBHOOK_SECRET
    if (webhookSecret) {
      const { searchParams } = new URL(req.url)
      const providedSecret = searchParams.get('secret') || req.headers.get('x-jotform-secret')
      if (providedSecret !== webhookSecret) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
      }
    }

    const body = await req.json()
    const parsed = parseFormFields(body)
    const submissionId = body.submissionID || body.submissionId || null

    // Find clinic by name
    if (!parsed.clinicName) {
      return NextResponse.json(
        { error: 'Clinic name is required in form submission' },
        { status: 400 }
      )
    }

    const clinic = await prisma.clinic.findFirst({
      where: {
        name: { contains: parsed.clinicName },
        active: true,
      },
    })
    if (!clinic) {
      return NextResponse.json(
        { error: `Clinic not found: ${parsed.clinicName}` },
        { status: 404 }
      )
    }

    // Find dentist by name within the clinic
    if (!parsed.dentistName) {
      return NextResponse.json(
        { error: 'Dentist name is required in form submission' },
        { status: 400 }
      )
    }

    const dentist = await prisma.dentist.findFirst({
      where: {
        clinicId: clinic.id,
        name: { contains: parsed.dentistName },
        active: true,
      },
    })
    if (!dentist) {
      return NextResponse.json(
        { error: `Dentist not found: ${parsed.dentistName} in clinic ${parsed.clinicName}` },
        { status: 404 }
      )
    }

    // Create or find patient
    let patientId: string | null = null
    if (parsed.patientRef) {
      let patient = await prisma.patient.findUnique({
        where: { reference: parsed.patientRef },
      })
      if (!patient) {
        // Derive firstName/lastName from patientName or dedicated fields
        let firstName = parsed.patientFirstName || null
        let lastName = parsed.patientLastName || null
        if (!firstName && parsed.patientName) {
          const parts = parsed.patientName.trim().split(/\s+/)
          firstName = parts[0] || null
          lastName = parts.length > 1 ? parts.slice(1).join(' ') : null
        }
        patient = await prisma.patient.create({
          data: {
            reference: parsed.patientRef,
            firstName,
            lastName,
            initials: parsed.patientInitials || null,
          },
        })
      }
      patientId = patient.id
    }

    // Generate case number: INITIALS-DD-MM
    const nowDate = new Date()
    const dd = String(nowDate.getDate()).padStart(2, '0')
    const mm = String(nowDate.getMonth() + 1).padStart(2, '0')
    const ptInitials = (parsed.patientInitials || 'XX').toUpperCase().replace(/[^A-Z]/g, '') || 'XX'
    let caseNumber = `${ptInitials}-${dd}-${mm}`
    let existingCase = await prisma.case.findUnique({ where: { caseNumber } })
    let sfx = 1
    while (existingCase) {
      caseNumber = `${ptInitials}-${dd}-${mm}-${sfx}`
      existingCase = await prisma.case.findUnique({ where: { caseNumber } })
      sfx++
    }

    // Determine department (default to CERAMICS)
    const department = parsed.department?.toUpperCase() || 'CERAMICS'
    const validDepartments = ['CERAMICS', 'APPLIANCES', 'DSD']
    const finalDepartment = validDepartments.includes(department) ? department : 'CERAMICS'

    // Build case items
    const itemsData: Array<{
      productId: string | null
      description: string
      qty: number
      toothNumbers: string | null
      material: string | null
      shade: string | null
      notes: string | null
      parameters: string | null
      unitPrice: number
      lineTotal: number
    }> = []

    // Try to find a matching product
    let product = null
    if (parsed.productName) {
      product = await prisma.product.findFirst({
        where: {
          name: { contains: parsed.productName },
          department: finalDepartment,
          active: true,
        },
      })
    }

    const qty = parsed.qty ? parseInt(parsed.qty) || 1 : 1
    const toothNumbersJson = parsed.toothNumbers
      ? JSON.stringify(
          parsed.toothNumbers.split(',').map((t) => parseInt(t.trim())).filter((n) => !isNaN(n))
        )
      : null

    let unitPrice = 0
    if (product) {
      unitPrice = await resolvePrice(product.id, clinic.id, dentist.id)
    }

    const lineTotal = calculateLineTotal(unitPrice, qty, toothNumbersJson)

    itemsData.push({
      productId: product?.id || null,
      description: parsed.productName || product?.name || `Jotform submission ${submissionId || ''}`.trim(),
      qty,
      toothNumbers: toothNumbersJson,
      material: parsed.material || null,
      shade: parsed.shade || null,
      notes: parsed.notes || null,
      parameters: null,
      unitPrice,
      lineTotal,
    })

    // Create the case
    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clinicId: clinic.id,
        dentistId: dentist.id,
        patientId,
        department: finalDepartment,
        status: 'NEW',
        priority: parsed.priority?.toUpperCase() || 'NORMAL',
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        notes: parsed.notes || null,
        source: 'JOTFORM',
        externalRef: submissionId ? String(submissionId) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
        patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
        items: true,
      },
    })

    await createAuditLog({
      caseId: newCase.id,
      action: 'CREATED',
      entityType: 'Case',
      entityId: newCase.id,
      newValue: {
        caseNumber: newCase.caseNumber,
        source: 'JOTFORM',
        externalRef: submissionId,
        clinicName: parsed.clinicName,
        dentistName: parsed.dentistName,
      },
    })

    // Sync to Monday.com as backup (non-blocking — don't fail the webhook if Monday sync fails)
    syncCaseToMonday({
      caseNumber: newCase.caseNumber,
      clinicName: newCase.clinic.name,
      dentistName: newCase.dentist.name,
      patientRef: newCase.patient?.reference || undefined,
      department: finalDepartment,
      status: 'NEW',
      priority: parsed.priority?.toUpperCase() || 'NORMAL',
      dueDate: parsed.dueDate || null,
      notes: parsed.notes || null,
      totalValue: lineTotal,
    }).catch(() => { /* silently ignore Monday sync failures */ })

    return NextResponse.json({ data: newCase }, { status: 201 })
  } catch (error) {
    console.error('Jotform webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process Jotform webhook' },
      { status: 500 }
    )
  }
}
