import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const message = await prisma.haloChatMessage.findUnique({
      where: { id },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Only mark as read if the reader is not the sender
    if (message.senderId !== user.id && !message.readAt) {
      const updated = await prisma.haloChatMessage.update({
        where: { id },
        data: { readAt: new Date() },
      })
      return NextResponse.json({ data: updated })
    }

    return NextResponse.json({ data: message })
  } catch (error) {
    return handleAuthError(error)
  }
}
