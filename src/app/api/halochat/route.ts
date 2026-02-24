import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const caseId = searchParams.get('caseId')

    const where: Record<string, unknown> = {}

    if (caseId) {
      where.caseId = caseId
    }

    // Dentists can only see messages for their own cases
    if (user.userType === 'DENTIST') {
      where.case = {
        dentistId: user.dentistId,
      }
    }

    const messages = await prisma.haloChatMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, userType: true },
        },
        case: {
          select: { id: true, caseNumber: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: messages })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { caseId, message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Determine senderType based on user's userType
    const senderType = user.userType === 'DENTIST' ? 'DENTIST' : 'INTERNAL'

    // If a caseId is provided, verify the user has access to this case
    if (caseId) {
      const caseData = await prisma.case.findUnique({ where: { id: caseId } })
      if (!caseData) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 })
      }

      // Dentists can only send messages for their own cases
      if (user.userType === 'DENTIST' && caseData.dentistId !== user.dentistId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const chatMessage = await prisma.haloChatMessage.create({
      data: {
        caseId: caseId || null,
        senderId: user.id,
        senderType,
        message: message.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true, userType: true },
        },
        case: {
          select: { id: true, caseNumber: true },
        },
      },
    })

    return NextResponse.json({ data: chatMessage }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
