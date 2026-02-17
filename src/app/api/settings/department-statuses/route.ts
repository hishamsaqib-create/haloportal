import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    await requireAuth()
    const configs = await prisma.departmentStatusConfig.findMany({
      orderBy: { department: 'asc' },
    })
    return NextResponse.json({ data: configs })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()
    const { department, statuses } = body as { department: string; statuses: string[] }

    if (!department || !Array.isArray(statuses)) {
      return NextResponse.json(
        { error: 'department (string) and statuses (array) are required' },
        { status: 400 }
      )
    }

    const config = await prisma.departmentStatusConfig.upsert({
      where: { department },
      update: { statuses: JSON.stringify(statuses) },
      create: {
        department,
        statuses: JSON.stringify(statuses),
        active: true,
      },
    })

    return NextResponse.json({ data: config })
  } catch (error) {
    return handleAuthError(error)
  }
}
