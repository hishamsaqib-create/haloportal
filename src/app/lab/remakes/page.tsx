'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime, formatDate, formatCurrency, getDueStatus } from '@/lib/utils'
import { REMAKE_REASON_CODES, REMAKE_REASON_LABELS, CASE_STATUS_LABELS } from '@/lib/constants'

type ViewTab = 'remake-records' | 'remake-cases'

interface Remake {
  id: string
  reasonCode: string
  reasonText: string | null
  costEstimate: number | null
  createdAt: string
  case: {
    id: string
    caseNumber: string
  }
  caseItem: {
    id: string
    description: string
  } | null
  createdBy: {
    id: string
    name: string
  }
}

interface RemakeCase {
  id: string
  caseNumber: string
  department: string
  status: string
  priority: string
  dueDate: string | null
  isRemake: boolean
  remakeReason: string | null
  createdAt: string
  patient: { id: string; reference: string; firstName: string | null; lastName: string | null; initials: string | null } | null
  clinic: { id: string; name: string } | null
  dentist: { id: string; name: string } | null
}

interface ReasonStat {
  reason: string
  count: number
  cost: number
}

export default function RemakesPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('remake-records')
  const [remakes, setRemakes] = useState<Remake[]>([])
  const [remakeCases, setRemakeCases] = useState<RemakeCase[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCases, setLoadingCases] = useState(true)
  const [filterReason, setFilterReason] = useState('')

  useEffect(() => {
    fetchRemakes()
  }, [filterReason])

  useEffect(() => {
    fetchRemakeCases()
  }, [])

  async function fetchRemakeCases() {
    setLoadingCases(true)
    try {
      const res = await fetch('/api/cases?limit=100&isRemake=true')
      if (res.ok) {
        const data = await res.json()
        setRemakeCases((data.data || []).filter((c: RemakeCase) => c.isRemake))
      }
    } catch {
      // ignore
    } finally {
      setLoadingCases(false)
    }
  }

  async function fetchRemakes() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterReason) params.set('reasonCode', filterReason)
    try {
      const res = await fetch(`/api/remakes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRemakes(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary stats
  const totalRemakes = remakes.length
  const totalEstimatedCost = remakes.reduce((sum, r) => sum + (r.costEstimate || 0), 0)

  const reasonStats: ReasonStat[] = REMAKE_REASON_CODES.map((code) => {
    const matching = remakes.filter((r) => r.reasonCode === code)
    return {
      reason: REMAKE_REASON_LABELS[code],
      count: matching.length,
      cost: matching.reduce((sum, r) => sum + (r.costEstimate || 0), 0),
    }
  }).filter((s) => s.count > 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remakes</h1>
          <p className="text-sm text-gray-500">Track and analyze remake reasons and costs</p>
        </div>
        <div className="flex rounded-xl border border-gray-200 p-0.5">
          <button
            onClick={() => setActiveTab('remake-records')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'remake-records' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Remake Records
          </button>
          <button
            onClick={() => setActiveTab('remake-cases')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'remake-cases' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cases Marked as Remake ({remakeCases.length})
          </button>
        </div>
      </div>

      {activeTab === 'remake-cases' ? (
        /* ---- Cases Marked as Remake View ---- */
        <div>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dentist</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Remake Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingCases ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td>
                    </tr>
                  ) : remakeCases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">No cases marked as remakes found.</td>
                    </tr>
                  ) : (
                    remakeCases.map((c) => {
                      const dueStatus = getDueStatus(c.dueDate)
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                              {c.caseNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {c.patient ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference : '\u2014'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{c.clinic?.name || '\u2014'}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">{c.dentist?.name || '\u2014'}</td>
                          <td className="px-6 py-3">
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                              {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
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
                          <td className="px-6 py-3">
                            {c.remakeReason ? (
                              <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                                {REMAKE_REASON_LABELS[c.remakeReason as keyof typeof REMAKE_REASON_LABELS] || c.remakeReason}
                              </span>
                            ) : '\u2014'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{formatDate(c.createdAt)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
      <div>
      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Remakes</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalRemakes}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-gray-500">Estimated Cost</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{formatCurrency(totalEstimatedCost)}</p>
        </div>
        {reasonStats.slice(0, 2).map((stat) => (
          <div key={stat.reason} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-500">{stat.reason}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.count}</p>
            <p className="mt-0.5 text-xs text-gray-500">{formatCurrency(stat.cost)} est. cost</p>
          </div>
        ))}
      </div>

      {/* Breakdown by Reason */}
      {reasonStats.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Breakdown by Reason</h2>
          <div className="space-y-3">
            {reasonStats.map((stat) => {
              const pct = totalRemakes > 0 ? (stat.count / totalRemakes) * 100 : 0
              return (
                <div key={stat.reason}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{stat.reason}</span>
                    <span className="text-gray-500">
                      {stat.count} ({pct.toFixed(1)}%) &middot; {formatCurrency(stat.cost)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-red-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Reasons</option>
          {REMAKE_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {REMAKE_REASON_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Reason Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Details</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost Estimate</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading remakes...
                  </td>
                </tr>
              ) : remakes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No remakes found.
                  </td>
                </tr>
              ) : (
                remakes.map((remake) => (
                  <tr key={remake.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/lab/cases/${remake.case.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        {remake.case.caseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {remake.caseItem?.description || 'General'}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        {REMAKE_REASON_LABELS[remake.reasonCode as keyof typeof REMAKE_REASON_LABELS] ||
                          remake.reasonCode}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{remake.reasonText || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">
                      {remake.costEstimate != null ? formatCurrency(remake.costEstimate) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{remake.createdBy.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {formatDateTime(remake.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}
