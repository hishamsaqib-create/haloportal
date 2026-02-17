import { NextRequest, NextResponse } from 'next/server'
import { testMondayConnection, fetchMondayBoardItems, syncCaseToMonday } from '@/lib/monday'

/**
 * GET /api/monday - Test connection or fetch board items
 * Query params:
 *   ?action=test - Test connection
 *   ?action=items&limit=50 - Fetch board items
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'test'

    if (action === 'test') {
      const result = await testMondayConnection()
      return NextResponse.json({ data: result })
    }

    if (action === 'items') {
      const limit = parseInt(searchParams.get('limit') || '50')
      const result = await fetchMondayBoardItems(limit)
      return NextResponse.json({ data: result })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Monday.com API error:', error)
    return NextResponse.json({ error: 'Failed to communicate with Monday.com' }, { status: 500 })
  }
}

/**
 * POST /api/monday - Sync a case to Monday.com
 * Body: { caseId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { caseId } = body

    if (!caseId) {
      return NextResponse.json({ error: 'caseId is required' }, { status: 400 })
    }

    // Import prisma dynamically to avoid circular deps
    const { prisma } = await import('@/lib/prisma')

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        clinic: { select: { name: true } },
        dentist: { select: { name: true } },
        patient: { select: { reference: true } },
        items: { select: { lineTotal: true } },
      },
    })

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const totalValue = caseData.items.reduce((sum, item) => sum + item.lineTotal, 0)

    const result = await syncCaseToMonday({
      caseNumber: caseData.caseNumber,
      clinicName: caseData.clinic.name,
      dentistName: caseData.dentist.name,
      patientRef: caseData.patient?.reference || undefined,
      department: caseData.department,
      status: caseData.status,
      priority: caseData.priority,
      dueDate: caseData.dueDate?.toISOString() || null,
      notes: caseData.notes,
      totalValue,
    })

    if (result.success && result.mondayItemId) {
      // Store the Monday item ID on the case for future updates
      await prisma.case.update({
        where: { id: caseId },
        data: { externalRef: result.mondayItemId },
      })
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Monday.com sync error:', error)
    return NextResponse.json({ error: 'Failed to sync to Monday.com' }, { status: 500 })
  }
}
