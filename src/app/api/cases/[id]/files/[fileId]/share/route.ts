import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

type RouteContext = { params: Promise<{ id: string; fileId: string }> }

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id, fileId } = await context.params

    // Verify the file belongs to this case
    const file = await prisma.caseFile.findFirst({
      where: { id: fileId, caseId: id },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Toggle sharedWithDentist
    const updated = await prisma.caseFile.update({
      where: { id: fileId },
      data: { sharedWithDentist: !file.sharedWithDentist },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}
