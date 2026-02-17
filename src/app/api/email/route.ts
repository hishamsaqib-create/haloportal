import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, scopeCaseQuery, handleAuthError, AuthError } from '@/lib/rbac'
import { sendEmail } from '@/lib/email'
import { sendEmailSchema } from '@/lib/validations'

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

    // Scope by case access for non-internal users
    if (user.userType !== 'INTERNAL') {
      const scopeWhere = scopeCaseQuery(user)
      where.case = scopeWhere
    }

    const [threads, total] = await Promise.all([
      prisma.emailThread.findMany({
        where,
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              clinic: { select: { id: true, name: true } },
              dentist: { select: { id: true, name: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Latest message preview
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailThread.count({ where }),
    ])

    return NextResponse.json({
      data: threads,
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
    const user = await requirePermission('email:write')
    const body = await req.json()
    const validated = sendEmailSchema.parse(body)

    // If template is provided, render it
    let html = validated.html
    if (validated.templateId) {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: validated.templateId },
      })
      if (template) {
        html = template.bodyHtml
      }
    }

    // Send the email
    const result = await sendEmail({
      to: validated.to,
      cc: validated.cc,
      subject: validated.subject,
      html,
      caseId: validated.caseId,
      sentById: user.id,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // If linked to a case, ensure a thread exists and store the message
    let thread = null
    if (validated.caseId) {
      thread = await prisma.emailThread.findFirst({
        where: { caseId: validated.caseId },
        orderBy: { createdAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      })
    }

    return NextResponse.json({
      data: {
        success: true,
        messageId: result.messageId,
        thread,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    }
    return handleAuthError(error)
  }
}
