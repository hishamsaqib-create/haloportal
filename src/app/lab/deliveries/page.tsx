'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_METHOD_LABELS,
  DELIVERY_STATUSES,
  DELIVERY_METHODS,
  type DeliveryStatus,
  type DeliveryMethod,
} from '@/lib/constants'

interface DeliveryRow {
  id: string
  deliveryNumber: string
  status: string
  method: string
  trackingRef: string | null
  driverName: string | null
  estimatedDate: string | null
  dispatchedAt: string | null
  deliveredAt: string | null
  createdAt: string
  clinic: { id: string; name: string; address: string | null }
  createdBy: { id: string; name: string } | null
  items: {
    id: string
    case: {
      id: string
      caseNumber: string
      department: string
      status: string
      patient: { reference: string; initials: string | null } | null
      dentist: { name: string }
    }
  }[]
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', method: '' })

  useEffect(() => {
    fetchDeliveries()
  }, [filters])

  async function fetchDeliveries() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.method) params.set('method', filters.method)

    const res = await fetch(`/api/deliveries?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDeliveries(data.data || [])
    }
    setLoading(false)
  }

  function statusColor(status: string) {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700'
      case 'COLLECTED': return 'bg-blue-50 text-blue-700'
      case 'IN_TRANSIT': return 'bg-indigo-50 text-indigo-700'
      case 'DELIVERED': return 'bg-green-50 text-green-700'
      case 'FAILED': return 'bg-red-50 text-red-700'
      default: return 'bg-gray-50 text-gray-700'
    }
  }

  function methodIcon(method: string) {
    switch (method) {
      case 'COURIER': return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      )
      case 'ROYAL_MAIL': return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      )
      case 'COLLECTION': return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      )
      default: return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
        </svg>
      )
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-sm text-gray-500">Track and manage dispatches to clinics</p>
        </div>
        <Link
          href="/lab/deliveries/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Delivery
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>{DELIVERY_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filters.method}
          onChange={(e) => setFilters({ ...filters, method: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Methods</option>
          {DELIVERY_METHODS.map((m) => (
            <option key={m} value={m}>{DELIVERY_METHOD_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {/* Deliveries Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Delivery #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Cases</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tracking</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Est. Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">No deliveries yet</p>
                    <p className="mt-1 text-xs text-gray-400">Create your first delivery to start dispatching cases to clinics.</p>
                    <Link href="/lab/deliveries/new" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
                      Create delivery &rarr;
                    </Link>
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/lab/deliveries/${d.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {d.deliveryNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-900">{d.clinic.name}</div>
                      {d.clinic.address && (
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{d.clinic.address}</div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-0.5">
                        {d.items.slice(0, 3).map((item) => (
                          <Link
                            key={item.id}
                            href={`/lab/cases/${item.case.id}`}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            {item.case.caseNumber}
                          </Link>
                        ))}
                        {d.items.length > 3 && (
                          <span className="text-xs text-gray-400">+{d.items.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        {methodIcon(d.method)}
                        {DELIVERY_METHOD_LABELS[d.method as DeliveryMethod] || d.method}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(d.status)}`}>
                        {DELIVERY_STATUS_LABELS[d.status as DeliveryStatus] || d.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {d.trackingRef || '\u2014'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {formatDate(d.estimatedDate)}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {formatDate(d.createdAt)}
                      {d.createdBy && (
                        <div className="text-gray-400">by {d.createdBy.name}</div>
                      )}
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
