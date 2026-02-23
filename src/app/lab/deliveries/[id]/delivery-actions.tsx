'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@/lib/constants'

export function DeliveryActions({
  deliveryId,
  currentStatus,
}: {
  deliveryId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Define valid next statuses based on current status
  const nextStatuses: Record<string, DeliveryStatus[]> = {
    PENDING: ['COLLECTED', 'IN_TRANSIT', 'FAILED'],
    COLLECTED: ['IN_TRANSIT', 'FAILED'],
    IN_TRANSIT: ['DELIVERED', 'FAILED'],
    FAILED: ['PENDING', 'IN_TRANSIT'],
  }

  const available = nextStatuses[currentStatus] || []

  async function updateStatus(status: DeliveryStatus) {
    const label = DELIVERY_STATUS_LABELS[status]
    if (!confirm(`Mark this delivery as "${label}"?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update status')
      }
    } catch {
      alert('Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  if (available.length === 0 || currentStatus === 'DELIVERED') return null

  const statusButtonColors: Record<string, string> = {
    COLLECTED: 'bg-blue-600 hover:bg-blue-700 text-white',
    IN_TRANSIT: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    DELIVERED: 'bg-green-600 hover:bg-green-700 text-white',
    FAILED: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
    PENDING: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
  }

  return (
    <div className="flex items-center gap-2">
      {available.map((status) => (
        <button
          key={status}
          onClick={() => updateStatus(status)}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${statusButtonColors[status] || 'bg-gray-900 text-white hover:bg-gray-800'}`}
        >
          {status === 'DELIVERED' && (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {status === 'IN_TRANSIT' && (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          )}
          {DELIVERY_STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  )
}
