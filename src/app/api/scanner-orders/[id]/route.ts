import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireInternal()
    const { id } = params

    const order = await prisma.scannerOrder.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            status: true,
            clinic: { select: { id: true, name: true } },
            dentist: { select: { id: true, name: true } },
            patient: { select: { id: true, reference: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Scanner order not found' }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireInternal()
    const { id } = params
    const body = await req.json()

    const allowedFields = ['scanner', 'orderNumber', 'patientName', 'doctorName', 'clinicName', 'status', 'caseId', 'externalUrl', 'notes', 'scannedAt']
    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'scannedAt') {
          data[field] = body[field] ? new Date(body[field]) : null
        } else if (field === 'caseId') {
          data[field] = body[field] || null
          // Auto-set status to LINKED when a case is linked
          if (body[field] && !body.status) {
            data.status = 'LINKED'
          }
        } else {
          data[field] = body[field]
        }
      }
    }

    const order = await prisma.scannerOrder.update({
      where: { id },
      data,
      include: {
        case: { select: { id: true, caseNumber: true, status: true } },
      },
    })

    return NextResponse.json({ data: order })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireInternal()
    const { id } = params

    await prisma.scannerOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
