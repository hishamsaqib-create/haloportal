import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    await requireInternal()

    const count = await prisma.scannerOrder.count({
      where: { status: { in: ['NEW', 'DOWNLOADED'] } },
    })

    return NextResponse.json({ count })
  } catch (error) {
    return handleAuthError(error)
  }
}
