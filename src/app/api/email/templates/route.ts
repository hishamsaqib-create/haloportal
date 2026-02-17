import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requirePermission, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(req.url)

    const category = searchParams.get('category')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (active !== null && active !== undefined) {
      where.active = active === 'true'
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('email:write')
    const body = await req.json()

    const { name, subject, bodyHtml, bodyText, variables, category, active, id } = body

    if (!name || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: 'name, subject, and bodyHtml are required' },
        { status: 400 }
      )
    }

    // If id provided, update existing template
    if (id) {
      const existing = await prisma.emailTemplate.findUnique({ where: { id } })
      if (!existing) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          name,
          subject,
          bodyHtml,
          bodyText: bodyText || null,
          variables: variables ? JSON.stringify(variables) : null,
          category: category || null,
          active: active !== undefined ? active : existing.active,
        },
      })

      return NextResponse.json({ data: template })
    }

    // Create new template
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        bodyHtml,
        bodyText: bodyText || null,
        variables: variables ? JSON.stringify(variables) : null,
        category: category || null,
        active: active !== undefined ? active : true,
      },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 409 }
      )
    }
    return handleAuthError(error)
  }
}
