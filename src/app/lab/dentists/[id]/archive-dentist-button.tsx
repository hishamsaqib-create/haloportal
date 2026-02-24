'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ArchiveDentistButton({ dentistId, active }: { dentistId: string; active: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const action = active ? 'archive' : 'restore'
    if (!confirm(`Are you sure you want to ${action} this dentist?`)) return

    setLoading(true)
    try {
      const res = await fetch(`/api/dentists/${dentistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      if (res.ok) router.refresh()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
      }`}
    >
      {loading ? 'Updating...' : active ? 'Archive Dentist' : 'Restore Dentist'}
    </button>
  )
}
