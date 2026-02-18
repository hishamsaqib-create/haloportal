'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DentistData {
  id: string
  name: string
  email: string | null
  gdcNumber: string | null
  active: boolean
}

export function DentistList({ dentists: initial }: { dentists: DentistData[] }) {
  const router = useRouter()
  const [dentists, setDentists] = useState(initial)
  const [showArchived, setShowArchived] = useState(false)

  const activeDentists = dentists.filter(d => d.active)
  const archivedDentists = dentists.filter(d => !d.active)
  const displayDentists = showArchived ? dentists : activeDentists

  async function toggleActive(id: string, currentlyActive: boolean) {
    try {
      const res = await fetch(`/api/dentists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentlyActive }),
      })
      if (res.ok) {
        setDentists(prev =>
          prev.map(d => d.id === id ? { ...d, active: !currentlyActive } : d)
        )
        router.refresh()
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Dentists ({activeDentists.length})
        </h2>
        {archivedDentists.length > 0 && (
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            {showArchived ? 'Hide archived' : `Show archived (${archivedDentists.length})`}
          </button>
        )}
      </div>
      {displayDentists.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-gray-500">
          {showArchived ? 'No dentists registered for this clinic.' : 'No active dentists. Click "Show archived" to see archived dentists.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {displayDentists.map((dentist) => (
            <div key={dentist.id} className={`flex items-center justify-between px-6 py-3 ${!dentist.active ? 'bg-gray-50/50' : ''}`}>
              <div>
                <p className={`text-sm font-medium ${dentist.active ? 'text-gray-900' : 'text-gray-400'}`}>{dentist.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {dentist.email && <span>{dentist.email}</span>}
                  {dentist.gdcNumber && <span>GDC: {dentist.gdcNumber}</span>}
                  {!dentist.active && (
                    <span className="inline-flex rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Archived
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleActive(dentist.id, dentist.active)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  dentist.active
                    ? 'text-amber-700 hover:bg-amber-50'
                    : 'text-green-700 hover:bg-green-50'
                }`}
              >
                {dentist.active ? 'Archive' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
