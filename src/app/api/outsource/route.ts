import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import { createOutsourceOrderSchema } from '@/lib/validations'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)

    const status = searchParams.get('status')
    const referralCentreId = searchParams.get('referralCentreId')
    const caseId = searchParams.get('caseId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (referralCentreId) where.referralCentreId = referralCentreId
    if (caseId) where.caseId = caseId

    const [orders, total] = await Promise.all([
      prisma.outsourceOrder.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              department: true,
              clinic: { select: { id: true, name: true } },
              patient: { select: { id: true, reference: true, initials: true } },
            },
          },
          referralCentre: {
            select: { id: true, name: true, email: true, defaultLeadTimeDays: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.outsourceOrder.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
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
    const user = await requirePermission('outsource:write')
    const body = await req.json()
    const validated = createOutsourceOrderSchema.parse(body)

    // Verify case exists
    const caseData = await prisma.case.findUnique({
      where: { id: validated.caseId },
      include: {
        items: true,
        patient: true,
      },
    })
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get referral centre for lead time calculation
    const referralCentre = await prisma.referralCentre.findUnique({
      where: { id: validated.referralCentreId },
    })
    if (!referralCentre) {
      return NextResponse.json({ error: 'Referral centre not found' }, { status: 404 })
    }

    // Calculate expected return date from lead time
    const now = new Date()
    const expectedReturnDate = new Date(now)
    expectedReturnDate.setDate(expectedReturnDate.getDate() + referralCentre.defaultLeadTimeDays)

    const order = await prisma.outsourceOrder.create({
      data: {
        caseId: validated.caseId,
        referralCentreId: validated.referralCentreId,
        status: 'QUEUED',
        sentAt: now,
        expectedReturnDate,
        notes: validated.notes || null,
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            patient: { select: { id: true, reference: true, initials: true } },
          },
        },
        referralCentre: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // If includeFileLink, generate a shareable link
    if (body.includeFileLink) {
      const caseFiles = await prisma.caseFile.findMany({
        where: { caseId: body.caseId },
        select: { fileName: true, fileUrl: true, fileType: true },
      })
      // Store file links in the outsource order notes for email template use
      if (caseFiles.length > 0) {
        const fileList = caseFiles.map(f => `- ${f.fileName}: ${process.env.APP_URL || 'https://haloportal.co.uk'}${f.fileUrl}`).join('\n')
        await prisma.outsourceOrder.update({
          where: { id: order.id },
          data: { notes: `${body.notes || ''}\n\nCase Files:\n${fileList}`.trim() },
        })
      }
    }

    // Send email to referral centre if they have an email configured
    if (referralCentre.email) {
      try {
        const { sendOutsourceEmail } = await import('@/lib/email')
        await sendOutsourceEmail({
          referralCentreEmail: referralCentre.email,
          caseNumber: caseData.caseNumber,
          patientRef: caseData.patient?.reference || 'N/A',
          items: caseData.items.map((i) => i.description).join(', '),
          dueDate: expectedReturnDate.toLocaleDateString('en-GB'),
          notes: validated.notes || '',
          caseId: validated.caseId,
          sentById: user.id,
        })
      } catch (emailError) {
        console.error('Failed to send outsource email:', emailError)
        // Non-blocking: continue even if email fails
      }
    }

    // Update case status to SENT_OUTSOURCE
    await prisma.case.update({
      where: { id: validated.caseId },
      data: { status: 'SENT_OUTSOURCE' },
    })

    await createAuditLog({
      caseId: validated.caseId,
      userId: user.id,
      action: 'CREATED',
      entityType: 'OutsourceOrder',
      entityId: order.id,
      newValue: {
        referralCentre: referralCentre.name,
        expectedReturnDate: expectedReturnDate.toISOString(),
      },
    })

    await createAuditLog({
      caseId: validated.caseId,
      userId: user.id,
      action: 'STATUS_CHANGE',
      entityType: 'Case',
      entityId: validated.caseId,
      oldValue: { status: caseData.status },
      newValue: { status: 'SENT_OUTSOURCE' },
    })

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
