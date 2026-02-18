'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, getDueStatus, formatCurrency } from '@/lib/utils'
import { CASE_STATUS_LABELS, DEPARTMENT_LABELS, DEPARTMENTS, CASE_STATUSES, PRIORITY_LABELS } from '@/lib/constants'

interface CaseRow {
  id: string
  caseNumber: string
  department: string
  status: string
  priority: string
  dueDate: string | null
  notes: string | null
  createdAt: string
  clinic: { name: string }
  dentist: { name: string }
  patient: { reference: string; initials: string | null } | null
  items: { id: string; description: string; lineTotal: number }[]
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    search: '',
  })

  useEffect(() => {
    fetchCases()
  }, [filters])

  async function fetchCases() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.department) params.set('department', filters.department)
    if (filters.search) params.set('search', filters.search)

    const res = await fetch(`/api/cases?${params}`)
    if (res.ok) {
      const data = await res.json()
      setCases(data.data || [])
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-sm text-gray-500">Manage all lab cases</p>
        </div>
        <Link
          href="/lab/cases/new"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          New Case
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search cases..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
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
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Cases Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic / Dentist</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : cases.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">No cases found</td></tr>
              ) : (
                cases.map((c) => {
                  const dueStatus = getDueStatus(c.dueDate)
                  const total = c.items.reduce((sum, i) => sum + i.lineTotal, 0)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {c.patient?.initials || c.patient?.reference || '—'}
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-gray-900">{c.clinic.name}</div>
                        <div className="text-xs text-gray-500">{c.dentist.name}</div>
                      </td>
                      <td className="px-6 py-3 text-xs font-medium text-gray-600">
                        {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS]}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                          {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.priority === 'URGENT' ? 'bg-red-50 text-red-700' :
                          c.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' :
                          'bg-gray-50 text-gray-600'
                        }`}>
                          {PRIORITY_LABELS[c.priority as keyof typeof PRIORITY_LABELS]}
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
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
