'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { formatDate, getDueStatus, formatCurrency } from '@/lib/utils'
import { CASE_STATUS_LABELS, DEPARTMENT_LABELS, DEPARTMENTS, CASE_STATUSES, PRIORITY_LABELS, canViewFinancials } from '@/lib/constants'

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
  patient: { id: string; reference: string; firstName: string | null; lastName: string | null; initials: string | null } | null
  items: { id: string; description: string; lineTotal: number }[]
}

type SpecialFilter = 'all' | 'active' | 'overdue' | 'due-today' | 'due-soon'

export default function CasesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const showFinancials = canViewFinancials(session?.user?.role || '')

  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 50

  // Read filters from URL params
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>(() => {
    const status = searchParams.get('status')
    const due = searchParams.get('due')
    if (status === 'active') return 'active'
    if (status === 'overdue') return 'overdue'
    if (due === 'today') return 'due-today'
    if (due === 'soon') return 'due-soon'
    return 'all'
  })
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get('status') || ''
    // Don't set status filter for special values
    if (['active', 'overdue'].includes(s)) return ''
    return s
  })
  const [departmentFilter, setDepartmentFilter] = useState(searchParams.get('department') || '')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('page', String(page))

      if (statusFilter) params.set('status', statusFilter)
      if (departmentFilter) params.set('department', departmentFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (search) params.set('search', search)

      // Handle special filters by fetching all active cases and filtering client-side for due date ones
      // or by adding specific API handling
      if (specialFilter === 'overdue' || specialFilter === 'due-today' || specialFilter === 'due-soon') {
        // Fetch active cases and filter by due date client-side
        params.delete('status')
        params.set('limit', '200')
      }

      const res = await fetch(`/api/cases?${params}`)
      if (res.ok) {
        const data = await res.json()
        let fetched: CaseRow[] = data.data || []

        // Apply special filters
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
        const in48h = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000)

        switch (specialFilter) {
          case 'active':
            fetched = fetched.filter((c) => !['COMPLETED', 'CANCELLED'].includes(c.status))
            break
          case 'overdue':
            fetched = fetched.filter((c) => {
              if (!c.dueDate || ['COMPLETED', 'CANCELLED'].includes(c.status)) return false
              return new Date(c.dueDate) < todayStart
            })
            break
          case 'due-today':
            fetched = fetched.filter((c) => {
              if (!c.dueDate || ['COMPLETED', 'CANCELLED'].includes(c.status)) return false
              const d = new Date(c.dueDate)
              return d >= todayStart && d < todayEnd
            })
            break
          case 'due-soon':
            fetched = fetched.filter((c) => {
              if (!c.dueDate || ['COMPLETED', 'CANCELLED'].includes(c.status)) return false
              const d = new Date(c.dueDate)
              return d >= todayEnd && d < in48h
            })
            break
        }

        setCases(fetched)
        setTotal(specialFilter === 'all' && !statusFilter ? data.pagination?.total || fetched.length : fetched.length)
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err)
    }
    setLoading(false)
  }, [page, statusFilter, departmentFilter, priorityFilter, search, specialFilter])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  function clearFilters() {
    setSpecialFilter('all')
    setStatusFilter('')
    setDepartmentFilter('')
    setPriorityFilter('')
    setSearch('')
    setPage(1)
  }

  const hasFilters = specialFilter !== 'all' || statusFilter || departmentFilter || priorityFilter || search
  const totalPages = Math.ceil(total / limit)

  const tabFilters: { key: SpecialFilter; label: string }[] = [
    { key: 'all', label: 'All Cases' },
    { key: 'active', label: 'Active' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'due-today', label: 'Due Today' },
    { key: 'due-soon', label: 'Due Soon' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-sm text-gray-500">
            {total} case{total !== 1 ? 's' : ''}{hasFilters ? ' matching filters' : ''}
          </p>
        </div>
        <Link
          href="/lab/cases/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Case
        </Link>
      </div>

      {/* Quick Filter Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-gray-200">
        {tabFilters.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setSpecialFilter(tab.key)
              if (tab.key !== 'all') setStatusFilter('')
              setPage(1)
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              specialFilter === tab.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search cases, patients, clinics..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 focus:border-gray-400 focus:outline-none"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>
          ))}
        </select>
        {specialFilter === 'all' && (
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 focus:border-gray-400 focus:outline-none"
          >
            <option value="">All Statuses</option>
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
            ))}
          </select>
        )}
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 focus:border-gray-400 focus:outline-none"
        >
          <option value="">All Priorities</option>
          {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Cases Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Patient</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Case #</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Clinic / Dentist</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dept</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Priority</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Due Date</th>
                {showFinancials && <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Value</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={showFinancials ? 8 : 7} className="px-6 py-16 text-center text-sm text-gray-400">Loading cases...</td></tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={showFinancials ? 8 : 7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      {hasFilters ? 'No cases match your filters' : 'No cases yet'}
                    </p>
                    {hasFilters ? (
                      <button onClick={clearFilters} className="mt-2 text-sm font-medium text-brand-700 hover:text-brand-800">
                        Clear filters
                      </button>
                    ) : (
                      <Link href="/lab/cases/new" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
                        Create your first case &rarr;
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const dueStatus = getDueStatus(c.dueDate)
                  const total = c.items.reduce((sum, i) => sum + i.lineTotal, 0)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {c.patient ? (
                          <Link href={`/lab/patients/${c.patient.id}`} className="hover:text-brand-700 hover:underline">
                            {[c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference}
                          </Link>
                        ) : '\u2014'}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-gray-900">{c.clinic.name}</div>
                        <div className="text-xs text-gray-400">{c.dentist.name}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                          c.department === 'CERAMICS' ? 'bg-blue-50 text-blue-700' :
                          c.department === 'APPLIANCES' ? 'bg-purple-50 text-purple-700' :
                          'bg-teal-50 text-teal-700'
                        }`}>
                          {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS] || c.department}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                          c.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                          c.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                          c.status === 'DISPATCHED' ? 'bg-indigo-50 text-indigo-700' :
                          c.status === 'READY' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'IN_PRODUCTION' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          c.priority === 'URGENT' ? 'bg-red-50 text-red-700' :
                          c.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {PRIORITY_LABELS[c.priority as keyof typeof PRIORITY_LABELS] || c.priority}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-sm ${
                          dueStatus === 'overdue' ? 'font-semibold text-red-600' :
                          dueStatus === 'today' ? 'font-semibold text-orange-600' :
                          dueStatus === 'tomorrow' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {formatDate(c.dueDate)}
                        </span>
                      </td>
                      {showFinancials && (
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(total)}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
