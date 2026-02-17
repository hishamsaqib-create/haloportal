/**
 * Monday.com API Integration
 *
 * Syncs cases from HaloPortal to a Monday.com board as a backup.
 * Data flow: JotForm → HaloPortal → Monday.com (push sync)
 */

import { prisma } from './prisma'

interface MondayConfig {
  apiKey: string
  boardId: string
}

async function getMondayConfig(): Promise<MondayConfig | null> {
  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: ['monday_api_key', 'monday_board_id'] } },
  })

  const apiKey = settings.find((s) => s.key === 'monday_api_key')?.value
  const boardId = settings.find((s) => s.key === 'monday_board_id')?.value

  if (!apiKey || !boardId) return null
  return { apiKey, boardId }
}

async function mondayQuery(config: MondayConfig, query: string, variables?: Record<string, unknown>) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: config.apiKey,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Monday.com API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  if (data.errors?.length) {
    throw new Error(`Monday.com query error: ${data.errors[0].message}`)
  }

  return data
}

/**
 * Push a new case to Monday.com board
 */
export async function syncCaseToMonday(caseData: {
  caseNumber: string
  clinicName: string
  dentistName: string
  patientRef?: string
  department: string
  status: string
  priority: string
  dueDate?: string | null
  notes?: string | null
  totalValue?: number
}): Promise<{ success: boolean; mondayItemId?: string; error?: string }> {
  try {
    const config = await getMondayConfig()
    if (!config) {
      return { success: false, error: 'Monday.com not configured' }
    }

    const columnValues: Record<string, unknown> = {
      // Standard text columns - these map to your Monday.com board columns
      // You'll need to configure the column IDs in Monday.com to match
      text: caseData.caseNumber,
      text0: caseData.clinicName,
      text1: caseData.dentistName,
      text2: caseData.patientRef || '',
      status: { label: caseData.status },
      status1: { label: caseData.department },
      status2: { label: caseData.priority },
    }

    if (caseData.dueDate) {
      columnValues.date = { date: caseData.dueDate.split('T')[0] }
    }

    if (caseData.notes) {
      columnValues.long_text = { text: caseData.notes }
    }

    if (caseData.totalValue) {
      columnValues.numbers = caseData.totalValue
    }

    const query = `
      mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
        }
      }
    `

    const result = await mondayQuery(config, query, {
      boardId: config.boardId,
      itemName: caseData.caseNumber,
      columnValues: JSON.stringify(columnValues),
    })

    const itemId = result.data?.create_item?.id
    return { success: true, mondayItemId: itemId }
  } catch (error) {
    console.error('Monday.com sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Update case status on Monday.com
 */
export async function updateCaseStatusOnMonday(
  mondayItemId: string,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getMondayConfig()
    if (!config) return { success: false, error: 'Monday.com not configured' }

    const query = `
      mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
        ) {
          id
        }
      }
    `

    await mondayQuery(config, query, {
      boardId: config.boardId,
      itemId: mondayItemId,
      columnValues: JSON.stringify({ status: { label: status } }),
    })

    return { success: true }
  } catch (error) {
    console.error('Monday.com status update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch items from Monday.com board (for pulling data)
 */
export async function fetchMondayBoardItems(limit = 50): Promise<{
  success: boolean
  items?: Array<{
    id: string
    name: string
    columnValues: Record<string, string>
  }>
  error?: string
}> {
  try {
    const config = await getMondayConfig()
    if (!config) return { success: false, error: 'Monday.com not configured' }

    const query = `
      query ($boardId: [ID!]!, $limit: Int!) {
        boards(ids: $boardId) {
          items_page(limit: $limit) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `

    const result = await mondayQuery(config, query, {
      boardId: [config.boardId],
      limit,
    })

    const items = result.data?.boards?.[0]?.items_page?.items || []
    return {
      success: true,
      items: items.map((item: any) => ({
        id: item.id,
        name: item.name,
        columnValues: Object.fromEntries(
          item.column_values.map((cv: any) => [cv.id, cv.text]),
        ),
      })),
    }
  } catch (error) {
    console.error('Monday.com fetch error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Test Monday.com connection
 */
export async function testMondayConnection(): Promise<{
  success: boolean
  boardName?: string
  error?: string
}> {
  try {
    const config = await getMondayConfig()
    if (!config) return { success: false, error: 'Monday.com not configured. Add API key and Board ID in Settings.' }

    const query = `
      query ($boardId: [ID!]!) {
        boards(ids: $boardId) {
          name
          columns {
            id
            title
            type
          }
        }
      }
    `

    const result = await mondayQuery(config, query, {
      boardId: [config.boardId],
    })

    const board = result.data?.boards?.[0]
    if (!board) return { success: false, error: 'Board not found. Check your Board ID.' }

    return { success: true, boardName: board.name }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}
