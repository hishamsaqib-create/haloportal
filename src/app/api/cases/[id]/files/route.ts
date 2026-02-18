import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const where: Record<string, unknown> = { caseId: id }

    // Dentists only see files shared with them
    if (user.userType === 'DENTIST') {
      where.sharedWithDentist = true
    }

    const files = await prisma.caseFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { name: true } },
      },
    })

    return NextResponse.json({ data: files })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    // Verify case exists
    const caseData = await prisma.case.findUnique({ where: { id } })
    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null
    const sharedWithDentist = formData.get('sharedWithDentist') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine file type
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    let fileType = 'other'
    if (ext === 'stl') fileType = 'stl'
    else if (ext === 'html' || ext === 'htm') fileType = 'html'
    else if (ext === 'pdf') fileType = 'pdf'
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image'

    // Save file to uploads directory
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'cases', id)
    await mkdir(uploadsDir, { recursive: true })

    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storedName = `${timestamp}_${safeFileName}`
    const filePath = join(uploadsDir, storedName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/cases/${id}/${storedName}`

    const caseFile = await prisma.caseFile.create({
      data: {
        caseId: id,
        fileName: file.name,
        fileType,
        fileUrl,
        fileSize: buffer.length,
        description: description || null,
        uploadedById: user.id,
        sharedWithDentist,
      },
    })

    return NextResponse.json({ data: caseFile }, { status: 201 })
  } catch (error) {
    console.error('File upload error:', error)
    return handleAuthError(error)
  }
}
