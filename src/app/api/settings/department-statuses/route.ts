import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

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
