'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
    clinic?: { name: string }
    patient?: { reference: string; initials: string | null }
  }
  referralCentre: {
    id: string
    name: string
    email: string | null
  }
}

interface ReferralCentre {
  id: string
  name: string
  email: string | null
  defaultLeadTimeDays: number
}

interface CaseInfo {
  id: string
  caseNumber: string
  department: string
  status: string
  clinic: { name: string }
  patient: { reference: string; initials: string | null } | null
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseIdParam = searchParams.get('caseId')

  const [orders, setOrders] = useState<OutsourceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCentre, setFilterCentre] = useState('')
  const [referralCentres, setReferralCentres] = useState<ReferralCentre[]>([])

  // New order form state
  const [showNewOrderForm, setShowNewOrderForm] = useState(!!caseIdParam)
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null)
  const [selectedCentreId, setSelectedCentreId] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [includeFileLink, setIncludeFileLink] = useState(false)
  const [creating, setCreating] = useState(false)

  const fetchOrders = useCallback(async () => {
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
  }, [filterStatus, filterCentre])

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

  // Fetch case info if caseId is provided
  useEffect(() => {
    if (caseIdParam) {
      fetch(`/api/cases/${caseIdParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.data) setCaseInfo(data.data)
        })
        .catch(() => {})
    }
  }, [caseIdParam])

  useEffect(() => {
    fetchOrders()
    fetchCentres()
  }, [fetchOrders])

  async function createOutsourceOrder() {
    if (!caseIdParam || !selectedCentreId) return
    setCreating(true)
    try {
      const res = await fetch('/api/outsource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseIdParam,
          referralCentreId: selectedCentreId,
          notes: orderNotes || undefined,
          includeFileLink,
        }),
      })
      if (res.ok) {
        setShowNewOrderForm(false)
        setSelectedCentreId('')
        setOrderNotes('')
        setIncludeFileLink(false)
        setCaseInfo(null)
        // Remove caseId from URL
        router.replace('/lab/outsourcing')
        fetchOrders()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create outsource order')
      }
    } catch {
      alert('Failed to create outsource order')
    } finally {
      setCreating(false)
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outsource Orders</h1>
          <p className="text-sm text-gray-500">Track outsourced work to referral centres</p>
        </div>
      </div>

      {/* New Order Form */}
      {showNewOrderForm && caseIdParam && (
        <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50 p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Create Outsource Order</h2>

          {/* Case info */}
          {caseInfo ? (
            <div className="mb-4 rounded-xl border border-purple-100 bg-white p-4">
              <p className="text-xs font-medium uppercase text-gray-400">Case</p>
              <div className="mt-1 flex items-center gap-3">
                <Link href={`/lab/cases/${caseInfo.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                  {caseInfo.caseNumber}
                </Link>
                <span className="text-sm text-gray-600">{caseInfo.clinic?.name}</span>
                {caseInfo.patient && (
                  <span className="text-sm text-gray-500">
                    {caseInfo.patient.initials || caseInfo.patient.reference}
                  </span>
                )}
                <span className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                  {caseInfo.department}
                </span>
              </div>
            </div>
          ) : (
            <div className="mb-4 text-sm text-gray-500">Loading case information...</div>
          )}

          {/* Referral Centre Selection */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Referral Centre</label>
            {referralCentres.length === 0 ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-sm text-orange-700">
                  No referral centres configured.{' '}
                  <Link href="/lab/referral-centres" className="font-medium underline">
                    Add one first
                  </Link>
                </p>
              </div>
            ) : (
              <select
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Select a referral centre...</option>
                {referralCentres.map((rc) => (
                  <option key={rc.id} value={rc.id}>
                    {rc.name} {rc.email ? `(${rc.email})` : ''} — {rc.defaultLeadTimeDays} day lead time
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions for the referral centre..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
              <label className="flex items-center gap-3 mt-3 cursor-pointer">
                <input type="checkbox" checked={includeFileLink} onChange={(e) => setIncludeFileLink(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-gray-700">Include link to case files in email to referral centre</span>
              </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={createOutsourceOrder}
              disabled={!selectedCentreId || creating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 active:scale-[0.98] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Send to Outsource'}
            </button>
            <button
              onClick={() => {
                setShowNewOrderForm(false)
                router.replace('/lab/outsourcing')
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
