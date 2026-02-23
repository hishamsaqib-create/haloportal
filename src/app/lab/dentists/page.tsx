'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface DentistRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  gdcNumber: string | null
  active: boolean
  clinic: { id: string; name: string }
  _count: { cases: number }
}

export default function DentistsPage() {
  const [dentists, setDentists] = useState<DentistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const fetchDentists = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (!showArchived) params.set('active', 'true')
      const res = await fetch(`/api/dentists?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDentists(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [search, showArchived])

  useEffect(() => {
    fetchDentists()
  }, [fetchDentists])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dentists</h1>
          <p className="text-sm text-gray-500">{dentists.length} dentist{dentists.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search dentists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show archived
        </label>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Clinic</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">GDC Number</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cases</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">Loading dentists...</td>
                </tr>
              ) : dentists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-500">
                    No dentists found.
                  </td>
                </tr>
              ) : (
                dentists.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/lab/dentists/${d.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {d.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{d.email || '\u2014'}</td>
                    <td className="px-6 py-3">
                      <Link href={`/lab/clinics/${d.clinic.id}`} className="text-sm text-gray-900 hover:underline">
                        {d.clinic.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{d.gdcNumber || '\u2014'}</td>
                    <td className="px-6 py-3 text-center text-sm font-medium text-gray-900">{d._count.cases}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        d.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {d.active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
