import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleAuthError } from '@/lib/rbac'

export async function GET() {
  try {
    const user = await requireAuth()

    if (user.userType !== 'DENTIST' || !user.dentistId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get dentist's clinic ID
    const dentist = await prisma.dentist.findUnique({
      where: { id: user.dentistId },
      select: { clinicId: true },
    })

    if (!dentist) {
      return NextResponse.json({ error: 'Dentist not found' }, { status: 404 })
    }

    // Get all files shared with dentist from their clinic's cases
    const files = await prisma.caseFile.findMany({
      where: {
        sharedWithDentist: true,
        case: {
          dentistId: user.dentistId,
        },
      },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            department: true,
            status: true,
            patient: { select: { initials: true, reference: true } },
          },
        },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: files })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.userType !== 'DENTIST' || !user.dentistId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null

    if (!file || !caseId) {
      return NextResponse.json({ error: 'File and caseId are required' }, { status: 400 })
    }

    // Verify case belongs to this dentist
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, dentistId: user.dentistId },
    })

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Save file to disk
    const fs = await import('fs/promises')
    const path = await import('path')
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cases', caseId)
    await fs.mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = path.join(uploadDir, `${Date.now()}-${safeName}`)
    await fs.writeFile(filePath, buffer)

    const fileUrl = `/uploads/cases/${caseId}/${path.basename(filePath)}`
    const ext = safeName.split('.').pop()?.toLowerCase() || 'other'
    const fileType = ['stl'].includes(ext) ? 'stl' : ['pdf'].includes(ext) ? 'pdf' : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : ['html', 'htm'].includes(ext) ? 'html' : 'other'

    const caseFile = await prisma.caseFile.create({
      data: {
        caseId,
        fileName: file.name,
        fileType,
        fileUrl,
        fileSize: buffer.length,
        direction: 'INBOUND',
        uploadedById: user.id,
        sharedWithDentist: true,
      },
    })

    return NextResponse.json({ data: caseFile }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
