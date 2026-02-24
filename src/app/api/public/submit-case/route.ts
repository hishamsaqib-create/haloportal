import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { resolvePrice, calculateLineTotal } from '@/lib/pricing'
import { syncCaseToMonday } from '@/lib/monday'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      // Common fields
      department,
      dentistId,
      patientName,
      patientDob,
      dueDate,
      notes,
      // Ceramics fields
      workRequired,
      teethNeeded,
      shade,
      translucency,
      anatomy,
      // Appliances fields
      appliance,
      quantity,
      iteroScanTaken,
      iteroScanId,
      // DSD fields
      teethOnDsd,
    } = body

    // Validate required fields
    if (!department || !dentistId) {
      return NextResponse.json(
        { error: 'Department and dentist are required' },
        { status: 400 }
      )
    }

    // Find dentist and their clinic
    const dentist = await prisma.dentist.findUnique({
      where: { id: dentistId },
      include: { clinic: { select: { id: true, name: true } } },
    })

    if (!dentist || !dentist.active) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    const clinic = dentist.clinic

    // Create or find patient
    let patientId: string | null = null
    if (patientName) {
      const nameParts = patientName.trim().split(/\s+/)
      const firstName = nameParts[0] || null
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null
      const initials = nameParts
        .map((w: string) => w[0]?.toUpperCase())
        .filter(Boolean)
        .join('')
      const year = new Date().getFullYear()
      const rand = Math.floor(1000 + Math.random() * 9000)
      const reference = `${initials || 'PAT'}-${year}-${rand}`

      const patient = await prisma.patient.create({
        data: {
          reference,
          firstName,
          lastName,
          initials,
          dob: patientDob || null,
        },
      })
      patientId = patient.id
    }

    // Generate case number: INITIALS-DD-MM
    const nowDate = new Date()
    const dd = String(nowDate.getDate()).padStart(2, '0')
    const mm = String(nowDate.getMonth() + 1).padStart(2, '0')
    const ptInitials = patientName
      ? patientName.split(/\s+/).map((w: string) => w[0]?.toUpperCase()).filter(Boolean).join('')
      : 'XX'
    let caseNumber = `${ptInitials || 'XX'}-${dd}-${mm}`
    let existingCase = await prisma.case.findUnique({ where: { caseNumber } })
    let sfx = 1
    while (existingCase) {
      caseNumber = `${ptInitials || 'XX'}-${dd}-${mm}-${sfx}`
      existingCase = await prisma.case.findUnique({ where: { caseNumber } })
      sfx++
    }

    // Build description based on department
    const descriptionParts: string[] = []
    let productSearchTerm: string | null = null

    switch (department) {
      case 'CERAMICS':
        if (workRequired?.length) {
          const items = Array.isArray(workRequired) ? workRequired : [workRequired]
          descriptionParts.push(items.join(', '))
          productSearchTerm = items[0]
        }
        if (shade) descriptionParts.push(`Shade: ${shade}`)
        if (translucency) descriptionParts.push(`Translucency: ${translucency}`)
        if (anatomy) descriptionParts.push(`Anatomy: ${anatomy}`)
        break
      case 'APPLIANCES':
        if (appliance) {
          descriptionParts.push(appliance)
          productSearchTerm = appliance
        }
        if (iteroScanTaken) descriptionParts.push(`iTero: ${iteroScanTaken}`)
        if (iteroScanId) descriptionParts.push(`Scan ID: ${iteroScanId}`)
        break
      case 'DSD':
        descriptionParts.push('Digital Smile Design')
        if (teethOnDsd) descriptionParts.push(`Teeth: ${teethOnDsd}`)
        productSearchTerm = 'DSD'
        break
    }

    const description = descriptionParts.join(' | ') || `${department} case`

    // Try to find a matching product
    let product = null
    if (productSearchTerm) {
      product = await prisma.product.findFirst({
        where: {
          name: { contains: productSearchTerm, mode: 'insensitive' },
          department,
          active: true,
        },
      })
    }

    const qty = quantity ? parseInt(quantity) || 1 : 1

    // Parse tooth numbers (UK notation: UR1-UR8, UL1-UL8, LR1-LR8, LL1-LL8)
    const rawTeeth = teethNeeded || teethOnDsd
    let toothNumbersJson: string | null = null
    if (rawTeeth) {
      const str = Array.isArray(rawTeeth) ? rawTeeth.join(',') : String(rawTeeth)
      const ukPattern = /^(UR|UL|LR|LL)[1-8]$/i
      const teeth = str
        .split(/[\s,;]+/)
        .map((t: string) => t.trim().toUpperCase())
        .filter((t: string) => ukPattern.test(t))
      if (teeth.length) toothNumbersJson = JSON.stringify(teeth)
    }

    // Calculate pricing
    let unitPrice = 0
    let minTeeth: number | null = null
    let additionalToothPrice: number | null = null
    if (product) {
      const resolved = await resolvePrice(product.id, clinic.id, dentist.id)
      unitPrice = resolved.price
      minTeeth = resolved.minTeeth
      additionalToothPrice = resolved.additionalToothPrice
    }
    const lineTotal = calculateLineTotal(unitPrice, qty, toothNumbersJson, minTeeth, additionalToothPrice)

    // Build notes
    const noteLines: string[] = []
    if (notes) noteLines.push(notes)
    if (department === 'APPLIANCES' && iteroScanTaken) {
      noteLines.push(`iTero scan taken: ${iteroScanTaken}`)
    }
    if (department === 'APPLIANCES' && iteroScanId) {
      noteLines.push(`iTero scan ID: ${iteroScanId}`)
    }
    const caseNotes = noteLines.join('\n') || null

    // Parse due date (required field - default to 7 days from now if not provided)
    let parsedDueDate: Date = new Date()
    parsedDueDate.setDate(parsedDueDate.getDate() + 7)
    if (dueDate) {
      const d = new Date(dueDate)
      if (!isNaN(d.getTime())) parsedDueDate = d
    }

    // Create the case
    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clinicId: clinic.id,
        dentistId: dentist.id,
        patientId,
        department,
        status: 'NEW',
        priority: 'NORMAL',
        dueDate: parsedDueDate,
        notes: caseNotes,
        source: 'WEBSITE',
        items: {
          create: [{
            productId: product?.id || null,
            description,
            qty,
            toothNumbers: toothNumbersJson,
            material: department === 'CERAMICS' ? (workRequired?.[0] || null) : null,
            shade: shade || null,
            notes: notes || null,
            parameters: JSON.stringify({
              ...(translucency && { translucency }),
              ...(anatomy && { anatomy }),
              ...(iteroScanId && { iteroScanId }),
              ...(iteroScanTaken && { iteroScanTaken }),
              ...(teethOnDsd && { teethOnDsd }),
            }),
            unitPrice,
            lineTotal,
          }],
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
        source: 'WEBSITE',
        department,
        dentistName: dentist.name,
        clinicName: clinic.name,
        patientName: patientName || null,
      },
    })

    // Sync to Monday.com as backup (non-blocking)
    syncCaseToMonday({
      caseNumber: newCase.caseNumber,
      clinicName: clinic.name,
      dentistName: dentist.name,
      patientRef: newCase.patient?.reference || undefined,
      department,
      status: 'NEW',
      priority: 'NORMAL',
      dueDate: dueDate || null,
      notes: caseNotes || null,
      totalValue: lineTotal,
    }).catch(() => { /* silently ignore Monday sync failures */ })

    return NextResponse.json({
      success: true,
      data: {
        caseNumber: newCase.caseNumber,
        department,
        clinic: clinic.name,
        dentist: dentist.name,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Case submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit case. Please try again.' },
      { status: 500 }
    )
  }
}
