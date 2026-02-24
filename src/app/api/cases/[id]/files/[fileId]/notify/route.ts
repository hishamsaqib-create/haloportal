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
      include: {
        case: {
          include: {
            dentist: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Mark as notified
    const updated = await prisma.caseFile.update({
      where: { id: fileId },
      data: { dentistNotified: true },
    })

    // TODO: Send actual email notification to dentist
    // The dentist email is available at file.case.dentist.email
    // For now we just update the DB flag
    console.log(
      `[STUB] Email notification would be sent to dentist "${file.case.dentist.name}" (${file.case.dentist.email}) about file "${file.fileName}" on case ${file.case.caseNumber}`
    )

    return NextResponse.json({ data: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}
