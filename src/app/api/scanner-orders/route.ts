import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireInternal, handleAuthError } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    await requireInternal()
    const { searchParams } = new URL(req.url)

    const scanner = searchParams.get('scanner')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (scanner) where.scanner = scanner
    if (status) where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { patientName: { contains: search, mode: 'insensitive' } },
        { doctorName: { contains: search, mode: 'insensitive' } },
        { clinicName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orders = await prisma.scannerOrder.findMany({
      where,
      include: {
        case: { select: { id: true, caseNumber: true, status: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ data: orders })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireInternal()
    const body = await req.json()

    const { scanner, orderNumber, patientName, doctorName, clinicName, externalUrl, notes, scannedAt } = body

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 })
    }

    const order = await prisma.scannerOrder.create({
      data: {
        scanner: scanner || 'ITERO',
        orderNumber,
        patientName: patientName || null,
        doctorName: doctorName || null,
        clinicName: clinicName || null,
        externalUrl: externalUrl || null,
        notes: notes || null,
        scannedAt: scannedAt ? new Date(scannedAt) : null,
      },
      include: {
        case: { select: { id: true, caseNumber: true, status: true } },
      },
    })

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
