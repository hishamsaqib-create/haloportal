'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { DEPARTMENT_LABELS, REMAKE_REASON_LABELS } from '@/lib/constants'

interface RevenueData {
  total: number
  byDepartment: { department: string; total: number }[]
  byMonth: { month: string; total: number }[]
}

interface TurnaroundData {
  overall: number
  byDepartment: { department: string; avgDays: number }[]
}

interface RemakeData {
  total: number
  totalCases: number
  rate: number
  byReason: { reason: string; count: number }[]
}

interface ArApData {
  outstandingAr: number
  outstandingArCount: number
  outstandingAp: number
  outstandingApCount: number
}

function StatsCard({
  title,
  value,
  subtitle,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const colors = {
    default: 'border-gray-200',
    danger: 'border-red-200 bg-red-50',
    warning: 'border-orange-200 bg-orange-50',
    success: 'border-green-200 bg-green-50',
  }
  const valueColors = {
    default: 'text-gray-900',
    danger: 'text-red-700',
    warning: 'text-orange-700',
    success: 'text-green-700',
  }

  return (
    <div className={`rounded-xl border bg-white p-5 ${colors[variant]}`}>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColors[variant]}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </div>
  )
}

export default function ReportingPage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null)
  const [turnaround, setTurnaround] = useState<TurnaroundData | null>(null)
  const [remakeData, setRemakeData] = useState<RemakeData | null>(null)
  const [arAp, setArAp] = useState<ArApData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)
    try {
      const [revRes, turnRes, remakeRes, arRes] = await Promise.all([
        fetch('/api/reports?type=revenue').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/reports?type=turnaround').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/reports?type=remakes').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/reports?type=ar-ap').then((r) => (r.ok ? r.json() : null)),
      ])
      if (revRes) setRevenue(revRes.data)
      if (turnRes) setTurnaround(turnRes.data)
      if (remakeRes) setRemakeData(remakeRes.data)
      if (arRes) setArAp(arRes.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
          <p className="text-sm text-gray-500">Lab performance analytics and metrics</p>
        </div>
        <div className="flex items-center justify-center py-24">
          <p className="text-sm text-gray-500">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
        <p className="text-sm text-gray-500">Lab performance analytics and metrics</p>
      </div>

      {/* Top-Level Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(revenue?.total || 0)}
          variant="success"
        />
        <StatsCard
          title="Avg Turnaround"
          value={turnaround?.overall ? `${turnaround.overall.toFixed(1)} days` : '---'}
        />
        <StatsCard
          title="Remake Rate"
          value={remakeData?.rate ? `${remakeData.rate.toFixed(1)}%` : '0%'}
          subtitle={`${remakeData?.total || 0} remakes of ${remakeData?.totalCases || 0} cases`}
          variant={remakeData && remakeData.rate > 5 ? 'danger' : 'default'}
        />
        <StatsCard
          title="Outstanding AR"
          value={formatCurrency(arAp?.outstandingAr || 0)}
          subtitle={`${arAp?.outstandingArCount || 0} invoices`}
          variant={arAp && arAp.outstandingAr > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue by Department */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Revenue by Department</h2>
          {revenue?.byDepartment && revenue.byDepartment.length > 0 ? (
            <div className="space-y-3">
              {revenue.byDepartment.map((dept) => {
                const pct = revenue.total > 0 ? (dept.total / revenue.total) * 100 : 0
                return (
                  <div key={dept.department}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {DEPARTMENT_LABELS[dept.department as keyof typeof DEPARTMENT_LABELS] || dept.department}
                      </span>
                      <span className="text-gray-500">
                        {formatCurrency(dept.total)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-brand-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No revenue data available.</p>
          )}
        </div>

        {/* Revenue by Month */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Revenue by Month</h2>
          {revenue?.byMonth && revenue.byMonth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-left text-xs font-medium uppercase text-gray-400">Month</th>
                    <th className="pb-2 text-right text-xs font-medium uppercase text-gray-400">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {revenue.byMonth.map((month) => (
                    <tr key={month.month}>
                      <td className="py-2 text-sm text-gray-700">{month.month}</td>
                      <td className="py-2 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(month.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No monthly data available.</p>
          )}
        </div>

        {/* Turnaround by Department */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Turnaround Times</h2>
          {turnaround?.byDepartment && turnaround.byDepartment.length > 0 ? (
            <div className="space-y-3">
              {turnaround.byDepartment.map((dept) => (
                <div key={dept.department} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {DEPARTMENT_LABELS[dept.department as keyof typeof DEPARTMENT_LABELS] || dept.department}
                  </span>
                  <span className="text-sm text-gray-900">{dept.avgDays.toFixed(1)} days</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No turnaround data available.</p>
          )}
        </div>

        {/* Remake Rate by Reason */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Remakes by Reason</h2>
          {remakeData?.byReason && remakeData.byReason.length > 0 ? (
            <div className="space-y-3">
              {remakeData.byReason.map((item) => {
                const pct = remakeData.total > 0 ? (item.count / remakeData.total) * 100 : 0
                return (
                  <div key={item.reason}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {REMAKE_REASON_LABELS[item.reason as keyof typeof REMAKE_REASON_LABELS] || item.reason}
                      </span>
                      <span className="text-gray-500">
                        {item.count} ({pct.toFixed(1)}%)
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
          ) : (
            <p className="text-sm text-gray-500">No remake data available.</p>
          )}
        </div>

        {/* Outstanding AR/AP */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Outstanding Accounts</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg bg-orange-50 p-4">
              <p className="text-sm font-medium text-orange-800">Accounts Receivable (AR)</p>
              <p className="mt-1 text-2xl font-bold text-orange-900">
                {formatCurrency(arAp?.outstandingAr || 0)}
              </p>
              <p className="mt-0.5 text-xs text-orange-600">
                {arAp?.outstandingArCount || 0} unpaid invoices
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">Accounts Payable (AP)</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">
                {formatCurrency(arAp?.outstandingAp || 0)}
              </p>
              <p className="mt-0.5 text-xs text-blue-600">
                {arAp?.outstandingApCount || 0} unpaid supplier invoices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
