import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const url = new URL(req.url)
    const phone = url.searchParams.get('phone')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    if (phone) {
      // Get messages for a specific contact
      const messages = await prisma.whatsAppMessage.findMany({
        where: { contactPhone: phone },
        orderBy: { createdAt: 'asc' },
        take: limit,
        include: { case: { select: { id: true, caseNumber: true } } },
      })
      return NextResponse.json({ data: messages })
    }

    // Get all conversations (latest message per contact)
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT ON ("contactPhone")
        "id", "contactName", "contactPhone", "content", "direction", "createdAt", "status"
      FROM "WhatsAppMessage"
      ORDER BY "contactPhone", "createdAt" DESC
    ` as Array<Record<string, unknown>>

    // Get unread counts per contact
    const contacts = await prisma.whatsAppMessage.groupBy({
      by: ['contactPhone', 'contactName'],
      _count: true,
      orderBy: { contactPhone: 'asc' },
    })

    return NextResponse.json({ data: conversations, contacts })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()
    const { contactName, contactPhone, content, caseId } = body

    if (!contactPhone || !content) {
      return NextResponse.json({ error: 'Phone and content are required' }, { status: 400 })
    }

    // Save message locally
    const message = await prisma.whatsAppMessage.create({
      data: {
        contactName: contactName || contactPhone,
        contactPhone,
        direction: 'OUTBOUND',
        content,
        caseId: caseId || null,
        status: 'sent',
      },
    })

    // Attempt to send via WhatsApp Cloud API
    const settings = await prisma.systemSettings.findMany({
      where: { key: { in: ['whatsapp_phone_id', 'whatsapp_access_token'] } },
    })
    const phoneId = settings.find((s) => s.key === 'whatsapp_phone_id')?.value
    const accessToken = settings.find((s) => s.key === 'whatsapp_access_token')?.value

    if (phoneId && accessToken) {
      try {
        const waRes = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: contactPhone.replace(/[^0-9]/g, ''),
            type: 'text',
            text: { body: content },
          }),
        })
        if (waRes.ok) {
          const waData = await waRes.json()
          await prisma.whatsAppMessage.update({
            where: { id: message.id },
            data: {
              waMessageId: waData.messages?.[0]?.id || null,
              status: 'delivered',
            },
          })
        }
      } catch {
        // WhatsApp API not configured or failed - message saved locally
      }
    }

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
