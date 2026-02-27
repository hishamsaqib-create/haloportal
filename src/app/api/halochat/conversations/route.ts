import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    await requireAuth()
    await requireInternal()

    // Get all halochat messages with sender and case info
    const messages = await prisma.haloChatMessage.findMany({
      include: {
        sender: {
          select: { id: true, name: true, userType: true, dentistId: true },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            dentistId: true,
            dentist: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by dentist
    const dentistMap = new Map<string, {
      dentistId: string
      dentistName: string
      lastMessage: string
      lastMessageAt: string
      unreadCount: number
      messageCount: number
    }>()

    for (const msg of messages) {
      // Determine which dentist this message belongs to
      let dentistId: string | null = null
      let dentistName = 'Unknown'

      if (msg.case?.dentistId) {
        dentistId = msg.case.dentistId
        dentistName = msg.case.dentist.name
      } else if (msg.sender.dentistId) {
        dentistId = msg.sender.dentistId
        dentistName = msg.sender.name
      }

      if (!dentistId) continue

      const existing = dentistMap.get(dentistId)
      if (!existing) {
        dentistMap.set(dentistId, {
          dentistId,
          dentistName,
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt.toISOString(),
          unreadCount: (!msg.readAt && msg.senderType === 'DENTIST') ? 1 : 0,
          messageCount: 1,
        })
      } else {
        existing.messageCount++
        if (!msg.readAt && msg.senderType === 'DENTIST') {
          existing.unreadCount++
        }
      }
    }

    const conversations = Array.from(dentistMap.values())
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    return NextResponse.json({ data: conversations })
  } catch (error) {
    return handleAuthError(error)
  }
}
