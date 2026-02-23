import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, scopeCaseQuery, handleAuthError, AuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)

    const caseId = searchParams.get('caseId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (caseId) where.caseId = caseId

    // Scope: only show prescriptions for cases the user can access
    if (user.userType !== 'INTERNAL') {
      const scopeWhere = scopeCaseQuery(user)
      where.case = scopeWhere
    }

    const [prescriptions, total] = await Promise.all([
      prisma.dAMASPrescription.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              department: true,
              clinic: { select: { id: true, name: true } },
              dentist: { select: { id: true, name: true } },
              patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
            },
          },
          generatedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { generatedAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.dAMASPrescription.count({ where }),
    ])

    return NextResponse.json({
      data: prescriptions,
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
    const user = await requirePermission('prescriptions:write')
    const body = await req.json()

    const { caseId } = body
    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    // Fetch full case data for structured prescription
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        clinic: true,
        dentist: true,
        patient: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Determine version by checking existing prescriptions
    const latestPrescription = await prisma.dAMASPrescription.findFirst({
      where: { caseId },
      orderBy: { version: 'desc' },
    })
    const newVersion = (latestPrescription?.version ?? 0) + 1

    // Build DAMAS-compliant structured data
    const structuredData = {
      prescriptionId: `DAMAS-${caseData.caseNumber}-v${newVersion}`,
      version: newVersion,
      generatedAt: new Date().toISOString(),
      case: {
        caseNumber: caseData.caseNumber,
        department: caseData.department,
        priority: caseData.priority,
        dueDate: caseData.dueDate?.toISOString() || null,
        notes: caseData.notes,
      },
      clinic: {
        name: caseData.clinic.name,
        address: caseData.clinic.address,
        phone: caseData.clinic.phone,
        email: caseData.clinic.email,
      },
      dentist: {
        name: caseData.dentist.name,
        gdcNumber: caseData.dentist.gdcNumber,
        email: caseData.dentist.email,
        phone: caseData.dentist.phone,
      },
      patient: caseData.patient
        ? {
            reference: caseData.patient.reference,
            initials: caseData.patient.initials,
            dob: caseData.patient.dob,
          }
        : null,
      items: caseData.items.map((item) => ({
        description: item.description,
        product: item.product
          ? {
              name: item.product.name,
              sku: item.product.sku,
              department: item.product.department,
            }
          : null,
        qty: item.qty,
        toothNumbers: item.toothNumbers ? JSON.parse(item.toothNumbers) : [],
        material: item.material,
        shade: item.shade,
        notes: item.notes,
        parameters: item.parameters ? JSON.parse(item.parameters) : null,
      })),
    }

    const prescription = await prisma.dAMASPrescription.create({
      data: {
        caseId,
        version: newVersion,
        generatedById: user.id,
        structuredData: JSON.stringify(structuredData),
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
          },
        },
        generatedBy: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      data: {
        ...prescription,
        structuredData,
      },
    }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
