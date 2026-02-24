import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    await requireAuth()
    const rules = await prisma.notificationRule.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: rules })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()

    const rule = await prisma.notificationRule.create({
      data: {
        name: body.name,
        trigger: body.trigger,
        triggerValue: body.triggerValue || null,
        channel: body.channel,
        templateId: body.templateId || null,
        recipient: body.recipient,
        active: body.active ?? true,
      },
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 })
    }

    const rule = await prisma.notificationRule.update({
      where: { id: body.id },
      data: {
        name: body.name ?? undefined,
        trigger: body.trigger ?? undefined,
        triggerValue: body.triggerValue ?? undefined,
        channel: body.channel ?? undefined,
        templateId: body.templateId ?? undefined,
        recipient: body.recipient ?? undefined,
        active: body.active ?? undefined,
      },
    })

    return NextResponse.json({ data: rule })
  } catch (error) {
    return handleAuthError(error)
  }
}
