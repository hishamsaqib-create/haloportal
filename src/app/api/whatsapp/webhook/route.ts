import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// WhatsApp webhook verification (GET)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  // Get verify token from settings
  let verifyToken = 'haloportal-whatsapp-verify'
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'whatsapp_verify_token' },
    })
    if (setting?.value) verifyToken = setting.value
  } catch {
    // use default
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// WhatsApp webhook for incoming messages (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Process WhatsApp Cloud API webhook payload
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (value?.messages) {
      for (const msg of value.messages) {
        const contactInfo = value.contacts?.find(
          (c: { wa_id: string }) => c.wa_id === msg.from
        )

        await prisma.whatsAppMessage.create({
          data: {
            contactName: contactInfo?.profile?.name || msg.from,
            contactPhone: msg.from,
            direction: 'INBOUND',
            messageType: msg.type || 'text',
            content: msg.text?.body || msg.caption || '[Media message]',
            waMessageId: msg.id,
            status: 'delivered',
          },
        })
      }
    }

    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        if (status.id) {
          await prisma.whatsAppMessage.updateMany({
            where: { waMessageId: status.id },
            data: { status: status.status },
          })
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'ok' })
  }
}
