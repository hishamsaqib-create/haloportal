'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CASE_STATUS_LABELS } from '@/lib/constants'

export function CaseActions({
  caseId,
  currentStatus,
  department,
  allowedStatuses,
}: {
  caseId: string
  currentStatus: string
  department: string
  allowedStatuses: string[]
}) {
  const router = useRouter()
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  async function changeStatus(newStatus: string) {
    setUpdating(true)
    setStatusDropdownOpen(false)
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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
      setUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status Change Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setStatusDropdownOpen(!statusDropdownOpen)
            setMoreDropdownOpen(false)
          }}
          disabled={updating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {updating ? 'Updating...' : 'Change Status'}
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {statusDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {allowedStatuses
                .filter((s) => s !== currentStatus)
                .map((status) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(status)}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] || status}
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      {/* More Actions Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setMoreDropdownOpen(!moreDropdownOpen)
            setStatusDropdownOpen(false)
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          More Actions
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {moreDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMoreDropdownOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setMoreDropdownOpen(false)
                  router.push(`/lab/outsourcing?caseId=${caseId}`)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Send to Outsource
              </button>
              <button
                onClick={() => {
                  setMoreDropdownOpen(false)
                  router.push(`/lab/prescriptions?caseId=${caseId}`)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Generate Prescription
              </button>
              <button
                onClick={() => {
                  setMoreDropdownOpen(false)
                  router.push(`/lab/remakes?caseId=${caseId}`)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Mark as Remake
              </button>
              <button
                onClick={() => {
                  setMoreDropdownOpen(false)
                  router.push(`/lab/email?caseId=${caseId}`)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Send Email
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={async () => {
                  setMoreDropdownOpen(false)
                  if (confirm('Are you sure you want to cancel this case?')) {
                    await changeStatus('CANCELLED')
                  }
                }}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Cancel Case
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
