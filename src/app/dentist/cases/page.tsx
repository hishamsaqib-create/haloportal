'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, getDueStatus } from '@/lib/utils'
import { DEPARTMENT_LABELS, DEPARTMENTS, DENTIST_STATUS_MAP, DENTIST_VISIBLE_STATUSES } from '@/lib/constants'

interface CaseRow {
  id: string
  caseNumber: string
  department: string
  status: string
  priority: string
  dueDate: string | null
  createdAt: string
  patient: { reference: string; firstName: string | null; lastName: string | null; initials: string | null } | null
  items: { id: string; description: string }[]
}

export default function DentistCasesPage() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', department: '' })

  useEffect(() => {
    fetchCases()
  }, [filters])

  async function fetchCases() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.department) params.set('department', filters.department)
    const res = await fetch(`/api/portal/dentist/cases?${params}`)
    if (res.ok) {
      const data = await res.json()
      let fetched: CaseRow[] = data.cases || []
      // Filter by dentist-visible status client-side
      if (filters.status) {
        fetched = fetched.filter((c) => DENTIST_STATUS_MAP[c.status] === filters.status)
      }
      setCases(fetched)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Cases</h1>
        <p className="text-sm text-gray-500">Track all your lab cases</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {DENTIST_VISIBLE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case #</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dept</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Items</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : cases.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">No cases found</td></tr>
            ) : (
              cases.map((c) => {
                const dueStatus = getDueStatus(c.dueDate)
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {c.patient ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/dentist/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {c.caseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-gray-600">
                      {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS]}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        DENTIST_STATUS_MAP[c.status] === 'Delivered' ? 'bg-green-50 text-green-700' :
                        DENTIST_STATUS_MAP[c.status] === 'Out for Delivery' ? 'bg-indigo-50 text-indigo-700' :
                        DENTIST_STATUS_MAP[c.status] === 'Cancelled' ? 'bg-red-50 text-red-700' :
                        DENTIST_STATUS_MAP[c.status] === 'Submitted' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {DENTIST_STATUS_MAP[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-sm ${
                        dueStatus === 'overdue' ? 'font-semibold text-red-600' :
                        dueStatus === 'today' ? 'font-semibold text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {formatDate(c.dueDate)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{c.items.length}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
