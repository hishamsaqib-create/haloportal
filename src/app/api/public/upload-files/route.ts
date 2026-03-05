import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const caseId = formData.get('caseId') as string | null
    const dentistId = formData.get('dentistId') as string | null
    const files = formData.getAll('files') as File[]

    if (!caseId || !dentistId) {
      return NextResponse.json(
        { error: 'caseId and dentistId are required' },
        { status: 400 }
      )
    }

    // Validate UUID format to prevent path traversal
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(caseId) || !uuidPattern.test(dentistId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Verify case exists, was submitted from website, and belongs to this dentist
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        dentistId,
        source: 'WEBSITE',
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'cases', caseId)
    await mkdir(uploadsDir, { recursive: true })

    const maxFileSize = 50 * 1024 * 1024 // 50MB per file
    const uploaded = []

    for (const file of files) {
      if (file.size > maxFileSize) {
        continue // skip oversized files
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let fileType = 'other'
      if (ext === 'stl') fileType = 'stl'
      else if (ext === 'html' || ext === 'htm') fileType = 'html'
      else if (ext === 'pdf') fileType = 'pdf'
      else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) fileType = 'image'

      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storedName = `${timestamp}_${safeFileName}`
      const filePath = join(uploadsDir, storedName)

      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      const fileUrl = `/uploads/cases/${caseId}/${storedName}`

      const caseFile = await prisma.caseFile.create({
        data: {
          caseId,
          fileName: file.name,
          fileType,
          fileUrl,
          fileSize: buffer.length,
          direction: 'INBOUND',
          sharedWithDentist: true,
        },
      })

      uploaded.push(caseFile)
    }

    return NextResponse.json(
      { success: true, data: { filesUploaded: uploaded.length } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Public file upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
