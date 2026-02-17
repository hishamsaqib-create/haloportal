'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { OUTSOURCE_STATUSES } from '@/lib/constants'

interface OutsourceOrder {
  id: string
  status: string
  sentAt: string | null
  expectedReturnDate: string | null
  actualReturnDate: string | null
  trackingRef: string | null
  notes: string | null
  createdAt: string
  case: {
    id: string
    caseNumber: string
    department: string
  }
  referralCentre: {
    id: string
    name: string
    email: string | null
  }
}

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  SENT: 'Sent',
  RECEIVED: 'Received',
  RETURNED: 'Returned',
}

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-50 text-blue-700',
  RECEIVED: 'bg-cyan-50 text-cyan-700',
  RETURNED: 'bg-green-50 text-green-700',
}

export default function OutsourcingPage() {
  const [orders, setOrders] = useState<OutsourceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCentre, setFilterCentre] = useState('')
  const [referralCentres, setReferralCentres] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetchOrders()
    fetchCentres()
  }, [filterStatus, filterCentre])

  async function fetchOrders() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterCentre) params.set('referralCentreId', filterCentre)
    try {
      const res = await fetch(`/api/outsource?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function fetchCentres() {
    try {
      const res = await fetch('/api/referral-centres')
      if (res.ok) {
        const data = await res.json()
        setReferralCentres(data.data || [])
      }
    } catch {
      // ignore
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'SENT') body.sentAt = new Date().toISOString()
      if (newStatus === 'RETURNED') body.actualReturnDate = new Date().toISOString()

      const res = await fetch(`/api/outsource/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        fetchOrders()
      }
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outsource Orders</h1>
        <p className="text-sm text-gray-500">Track outsourced work to referral centres</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {OUTSOURCE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] || s}
            </option>
          ))}
        </select>

        <select
          value={filterCentre}
          onChange={(e) => setFilterCentre(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Referral Centres</option>
          {referralCentres.map((rc) => (
            <option key={rc.id} value={rc.id}>
              {rc.name}
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Referral Centre</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Sent Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Expected Return</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actual Return</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tracking</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    No outsource orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/lab/cases/${order.case.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        {order.case.caseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.referralCentre.name}</div>
                      {order.referralCentre.email && (
                        <div className="text-xs text-gray-500">{order.referralCentre.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(order.sentAt)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {formatDate(order.expectedReturnDate)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {formatDate(order.actualReturnDate)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{order.trackingRef || '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'QUEUED' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'SENT')}
                            className="text-sm font-medium text-blue-700 hover:text-blue-800"
                          >
                            Mark Sent
                          </button>
                        )}
                        {order.status === 'SENT' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'RECEIVED')}
                            className="text-sm font-medium text-cyan-700 hover:text-cyan-800"
                          >
                            Mark Received
                          </button>
                        )}
                        {order.status === 'RECEIVED' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'RETURNED')}
                            className="text-sm font-medium text-green-700 hover:text-green-800"
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
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
