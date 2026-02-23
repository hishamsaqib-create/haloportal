'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface Patient {
  id: string
  reference: string
  firstName: string | null
  lastName: string | null
  initials: string | null
  dob: string | null
  createdAt: string
  _count: { cases: number }
  cases: {
    id: string
    status: string
    clinic: { name: string }
    dentist: { name: string }
  }[]
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (search.trim()) params.set('search', search.trim())
    const res = await fetch(`/api/patients?${params}`)
    if (res.ok) {
      const json = await res.json()
      setPatients(json.data)
      setTotalPages(json.pagination.totalPages)
      setTotal(json.pagination.total)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  useEffect(() => { setPage(1) }, [search])

  function patientName(p: Patient): string {
    const full = [p.firstName, p.lastName].filter(Boolean).join(' ')
    return full || p.initials || p.reference
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500">{total} patient{total !== 1 ? 's' : ''} on file</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, initials or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Patient</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Reference</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">DOB</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cases</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last Clinic</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last Dentist</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">Loading patients...</td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      {search ? 'No patients match your search' : 'No patients yet'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Patient records are created when cases are submitted.
                    </p>
                  </td>
                </tr>
              ) : patients.map((p) => {
                const lastCase = p.cases[0]
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/lab/patients/${p.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {patientName(p)}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 font-mono">{p.reference}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{p.dob || '\u2014'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        {p._count.cases}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{lastCase?.clinic.name || '\u2014'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{lastCase?.dentist.name || '\u2014'}</td>
                    <td className="px-6 py-3 text-sm text-gray-400">{formatDate(p.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} ({total} patients)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
