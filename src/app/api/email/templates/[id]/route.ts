import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, handleAuthError } from '@/lib/rbac'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission('email:write')
    const { id } = params
    const body = await req.json()
    const { subject, bodyHtml, bodyText, active } = body

    const existing = await prisma.emailTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(bodyText !== undefined && { bodyText }),
        ...(active !== undefined && { active }),
      },
    })

    return NextResponse.json({ data: template })
  } catch (error) {
    return handleAuthError(error)
  }
}
