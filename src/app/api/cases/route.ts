import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, scopeCaseQuery, handleAuthError, AuthUser, AuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { resolvePrice, calculateLineTotal } from '@/lib/pricing'
import { createCaseSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const clinicId = searchParams.get('clinicId')
    const dentistId = searchParams.get('dentistId')
    const dueDateFrom = searchParams.get('dueDateFrom')
    const dueDateTo = searchParams.get('dueDateTo')
    const search = searchParams.get('search')
    const priority = searchParams.get('priority')

    // Build where clause with scope
    const scopeWhere = scopeCaseQuery(user)
    const where: Record<string, unknown> = { ...scopeWhere }

    if (status) where.status = status
    if (department) where.department = department
    if (clinicId && user.userType === 'INTERNAL') where.clinicId = clinicId
    if (dentistId && user.userType !== 'DENTIST') where.dentistId = dentistId
    if (priority) where.priority = priority

    // Due date range filter
    if (dueDateFrom || dueDateTo) {
      const dueDateFilter: Record<string, Date> = {}
      if (dueDateFrom) dueDateFilter.gte = new Date(dueDateFrom)
      if (dueDateTo) dueDateFilter.lte = new Date(dueDateTo)
      where.dueDate = dueDateFilter
    }

    // Search filter across case number, notes, patient reference/name
    if (search) {
      where.OR = [
        { caseNumber: { contains: search } },
        { notes: { contains: search } },
        { patient: { reference: { contains: search } } },
        { patient: { firstName: { contains: search, mode: 'insensitive' } } },
        { patient: { lastName: { contains: search, mode: 'insensitive' } } },
        { patient: { initials: { contains: search } } },
        { clinic: { name: { contains: search } } },
        { dentist: { name: { contains: search } } },
      ]
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        include: {
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
          patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
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

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('cases:write')
    const body = await req.json()
    const validated = createCaseSchema.parse(body)

    // Create or find patient if reference provided
    let patientId: string | null = null
    if (validated.patientRef) {
      let patient = await prisma.patient.findUnique({
        where: { reference: validated.patientRef },
      })
      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            reference: validated.patientRef,
            firstName: validated.patientFirstName || null,
            lastName: validated.patientLastName || null,
            initials: validated.patientInitials || null,
          },
        })
      } else if (validated.patientFirstName || validated.patientLastName) {
        // Update existing patient with name data if provided
        patient = await prisma.patient.update({
          where: { id: patient.id },
          data: {
            ...(validated.patientFirstName && { firstName: validated.patientFirstName }),
            ...(validated.patientLastName && { lastName: validated.patientLastName }),
            ...(validated.patientInitials && { initials: validated.patientInitials }),
          },
        })
      }
      patientId = patient.id
    }

    // Generate case number: DEPT-INITIALS-0001 (e.g. C-HS-0001)
    const deptCode = validated.department === 'CERAMICS' ? 'C' : validated.department === 'DSD' ? 'D' : 'A'
    const initials = (validated.patientInitials || 'XX').toUpperCase().replace(/[^A-Z]/g, '') || 'XX'
    const prefix = `${deptCode}-${initials}-`

    // Find the highest existing case number with this prefix
    const lastCase = await prisma.case.findFirst({
      where: { caseNumber: { startsWith: prefix } },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    })

    let seq = 1
    if (lastCase) {
      const lastNum = parseInt(lastCase.caseNumber.replace(prefix, ''), 10)
      if (!isNaN(lastNum)) seq = lastNum + 1
    }
    const caseNumber = `${prefix}${String(seq).padStart(4, '0')}`

    // Resolve pricing for each item
    const itemsData = await Promise.all(
      validated.items.map(async (item) => {
        let unitPrice = item.unitPrice ?? 0

        // Resolve price from pricing rules if productId provided and no explicit price
        let minTeeth: number | null = null
        let additionalToothPrice: number | null = null
        if (item.productId && item.unitPrice === undefined) {
          const resolved = await resolvePrice(
            item.productId,
            validated.clinicId,
            validated.dentistId
          )
          unitPrice = resolved.price
          minTeeth = resolved.minTeeth
          additionalToothPrice = resolved.additionalToothPrice
        }

        const toothNumbersJson = item.toothNumbers
          ? JSON.stringify(item.toothNumbers)
          : null

        const lineTotal = calculateLineTotal(
          unitPrice,
          item.qty,
          toothNumbersJson,
          minTeeth,
          additionalToothPrice
        )

        return {
          productId: item.productId || null,
          description: item.description,
          qty: item.qty,
          toothNumbers: toothNumbersJson,
          material: item.material || null,
          shade: item.shade || null,
          notes: item.notes || null,
          parameters: item.parameters ? JSON.stringify(item.parameters) : null,
          unitPrice,
          lineTotal,
        }
      })
    )

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clinicId: validated.clinicId,
        dentistId: validated.dentistId,
        patientId,
        department: validated.department,
        status: 'NEW',
        priority: validated.priority,
        dueDate: new Date(validated.dueDate),
        notes: validated.notes || null,
        source: 'MANUAL',
        isRemake: validated.isRemake || false,
        remakeReason: validated.isRemake ? (validated.remakeReason || null) : null,
        items: {
          create: itemsData,
        },
      },
      include: {
        clinic: { select: { id: true, name: true } },
        dentist: { select: { id: true, name: true } },
        patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    })

    // Auto-create a Remake record if this case is flagged as a remake
    if (validated.isRemake && validated.remakeReason) {
      await prisma.remake.create({
        data: {
          caseId: newCase.id,
          reasonCode: validated.remakeReason,
          reasonText: validated.remakeReason === 'OTHER' ? (validated.notes || null) : null,
          createdById: user.id,
        },
      })
    }

    await createAuditLog({
      caseId: newCase.id,
      userId: user.id,
      action: 'CREATED',
      entityType: 'Case',
      entityId: newCase.id,
      newValue: {
        caseNumber: newCase.caseNumber,
        department: newCase.department,
        clinicId: newCase.clinicId,
        dentistId: newCase.dentistId,
        itemCount: itemsData.length,
        isRemake: validated.isRemake || false,
        remakeReason: validated.remakeReason,
      },
    })

    return NextResponse.json({ data: newCase }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
