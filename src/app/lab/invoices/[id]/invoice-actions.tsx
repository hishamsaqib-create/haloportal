'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function InvoiceActions({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  async function updateStatus(newStatus: string, extra?: Record<string, unknown>) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extra }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update invoice')
      }
    } catch {
      alert('Failed to update invoice')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentStatus === 'DRAFT' && (
        <button
          onClick={() => updateStatus('SENT')}
          disabled={updating}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {updating ? 'Updating...' : 'Mark as Sent'}
        </button>
      )}

      {(currentStatus === 'SENT' || currentStatus === 'OVERDUE') && (
        <button
          onClick={() => updateStatus('PAID', { paidDate: new Date().toISOString() })}
          disabled={updating}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {updating ? 'Updating...' : 'Mark as Paid'}
        </button>
      )}

      <button
        onClick={() => alert('PDF download coming soon')}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Download PDF
      </button>
    </div>
  )
}
