import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'
import { unlink } from 'fs/promises'
import { join } from 'path'

type RouteContext = { params: Promise<{ id: string; fileId: string }> }

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { fileId } = await context.params
    const body = await req.json()

    const file = await prisma.caseFile.findUnique({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const updated = await prisma.caseFile.update({
      where: { id: fileId },
      data: {
        ...(body.sharedWithDentist !== undefined && { sharedWithDentist: body.sharedWithDentist }),
        ...(body.description !== undefined && { description: body.description }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await requireAuth()
    const { fileId } = await context.params

    const file = await prisma.caseFile.findUnique({ where: { id: fileId } })
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), 'public', file.fileUrl)
      await unlink(filePath)
    } catch {
      // File may not exist on disk, continue with DB deletion
    }

    await prisma.caseFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
