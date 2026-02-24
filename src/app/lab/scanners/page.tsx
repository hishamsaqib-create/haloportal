'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDateTime, formatRelative } from '@/lib/utils'
import {
  SCANNER_TYPES,
  SCANNER_LABELS,
  SCANNER_PORTAL_URLS,
  SCANNER_ORDER_STATUSES,
  SCANNER_ORDER_STATUS_LABELS,
} from '@/lib/constants'

interface ScannerOrder {
  id: string
  scanner: string
  orderNumber: string
  patientName: string | null
  doctorName: string | null
  clinicName: string | null
  status: string
  externalUrl: string | null
  notes: string | null
  scannedAt: string | null
  receivedAt: string
  case: { id: string; caseNumber: string; status: string } | null
}

interface CaseOption {
  id: string
  caseNumber: string
  patient: { firstName: string | null; lastName: string | null; reference: string } | null
  clinic: { name: string }
  dentist: { name: string }
}

export default function ScannerInboxPage() {
  const [orders, setOrders] = useState<ScannerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filterScanner, setFilterScanner] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  // Add order modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [formScanner, setFormScanner] = useState('ITERO')
  const [formOrderNumber, setFormOrderNumber] = useState('')
  const [formPatientName, setFormPatientName] = useState('')
  const [formDoctorName, setFormDoctorName] = useState('')
  const [formClinicName, setFormClinicName] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Link to case modal
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkingOrder, setLinkingOrder] = useState<ScannerOrder | null>(null)
  const [caseSearch, setCaseSearch] = useState('')
  const [caseOptions, setCaseOptions] = useState<CaseOption[]>([])
  const [loadingCases, setLoadingCases] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterScanner) params.set('scanner', filterScanner)
    if (filterStatus) params.set('status', filterStatus)
    if (search) params.set('search', search)
    try {
      const res = await fetch(`/api/scanner-orders?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [filterScanner, filterStatus, search])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  function openAddModal() {
    setFormScanner('ITERO')
    setFormOrderNumber('')
    setFormPatientName('')
    setFormDoctorName('')
    setFormClinicName('')
    setFormNotes('')
    setError(null)
    setShowAddModal(true)
  }

  async function handleAddOrder(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/scanner-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanner: formScanner,
          orderNumber: formOrderNumber,
          patientName: formPatientName || undefined,
          doctorName: formDoctorName || undefined,
          clinicName: formClinicName || undefined,
          notes: formNotes || undefined,
        }),
      })
      if (res.ok) {
        setShowAddModal(false)
        fetchOrders()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create order')
      }
    } catch {
      setError('Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      await fetch(`/api/scanner-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      fetchOrders()
    } catch {
      // ignore
    }
  }

  function openPortal(order: ScannerOrder) {
    const url = order.externalUrl || SCANNER_PORTAL_URLS[order.scanner as keyof typeof SCANNER_PORTAL_URLS] || ''
    if (url) {
      window.open(url, '_blank')
      // Auto-mark as downloaded if it's new
      if (order.status === 'NEW') {
        updateStatus(order.id, 'DOWNLOADED')
      }
    }
  }

  function openLinkModal(order: ScannerOrder) {
    setLinkingOrder(order)
    setCaseSearch('')
    setCaseOptions([])
    setShowLinkModal(true)
  }

  async function searchCases(query: string) {
    setCaseSearch(query)
    if (query.length < 2) {
      setCaseOptions([])
      return
    }
    setLoadingCases(true)
    try {
      const res = await fetch(`/api/cases?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setCaseOptions(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoadingCases(false)
    }
  }

  async function linkToCase(caseId: string) {
    if (!linkingOrder) return
    try {
      await fetch(`/api/scanner-orders/${linkingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, status: 'LINKED' }),
      })
      setShowLinkModal(false)
      setLinkingOrder(null)
      fetchOrders()
    } catch {
      // ignore
    }
  }

  async function unlinkCase(orderId: string) {
    try {
      await fetch(`/api/scanner-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: null, status: 'DOWNLOADED' }),
      })
      fetchOrders()
    } catch {
      // ignore
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      NEW: 'bg-blue-50 text-blue-700 border-blue-200',
      DOWNLOADED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      LINKED: 'bg-green-50 text-green-700 border-green-200',
      COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
    }
    return styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  }

  function getScannerBadge(scanner: string) {
    const styles: Record<string, string> = {
      ITERO: 'bg-indigo-50 text-indigo-700',
      TRIOS: 'bg-purple-50 text-purple-700',
      MEDIT: 'bg-cyan-50 text-cyan-700',
      PRIMESCAN: 'bg-orange-50 text-orange-700',
      OTHER: 'bg-gray-50 text-gray-600',
    }
    return styles[scanner] || 'bg-gray-50 text-gray-600'
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  const newCount = orders.filter((o) => o.status === 'NEW').length

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scanner Inbox</h1>
          <p className="text-sm text-gray-500">
            Track incoming digital scans from iTero, TRIOS, Medit and other scanners
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Log Scanner Order
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'New', count: orders.filter((o) => o.status === 'NEW').length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Downloaded', count: orders.filter((o) => o.status === 'DOWNLOADED').length, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
          { label: 'Linked', count: orders.filter((o) => o.status === 'LINKED').length, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Completed', count: orders.filter((o) => o.status === 'COMPLETED').length, color: 'text-gray-600 bg-gray-50 border-gray-200' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl border px-4 py-3 ${stat.color}`}>
            <div className="text-2xl font-bold">{stat.count}</div>
            <div className="text-xs font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* iTero Quick Access */}
      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">MyiTero Lab Portal</p>
              <p className="text-xs text-indigo-700">Open MyiTero to download scans and prescriptions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="https://myitero.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Open MyiTero
            </a>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none w-64"
        />
        <select
          value={filterScanner}
          onChange={(e) => setFilterScanner(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Scanners</option>
          {SCANNER_TYPES.map((s) => (
            <option key={s} value={s}>
              {SCANNER_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {SCANNER_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SCANNER_ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Scanner</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Order #</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Doctor / Clinic</th>
                <th className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Linked Case</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Received</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-500">
                    Loading scanner orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="mx-auto max-w-sm">
                      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No scanner orders yet.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        When you receive a scan notification, log it here to track progress.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className={`hover:bg-gray-50 ${order.status === 'NEW' ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getScannerBadge(order.scanner)}`}>
                        {SCANNER_LABELS[order.scanner as keyof typeof SCANNER_LABELS] || order.scanner}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-mono font-medium text-gray-900">{order.orderNumber}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {order.patientName || <span className="text-gray-400">--</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm text-gray-700">{order.doctorName || <span className="text-gray-400">--</span>}</div>
                      {order.clinicName && <div className="text-xs text-gray-400">{order.clinicName}</div>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(order.status)}`}>
                        {SCANNER_ORDER_STATUS_LABELS[order.status as keyof typeof SCANNER_ORDER_STATUS_LABELS] || order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {order.case ? (
                        <Link
                          href={`/lab/cases/${order.case.id}`}
                          className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          {order.case.caseNumber}
                        </Link>
                      ) : (
                        <button
                          onClick={() => openLinkModal(order)}
                          className="text-xs font-medium text-gray-500 hover:text-brand-700 border border-dashed border-gray-300 rounded px-2 py-1 hover:border-brand-500 transition-colors"
                        >
                          Link to case
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-sm text-gray-700">{formatRelative(order.receivedAt)}</div>
                      <div className="text-[10px] text-gray-400">{formatDateTime(order.receivedAt)}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Open in scanner portal */}
                        <button
                          onClick={() => openPortal(order)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                          title={`Open in ${SCANNER_LABELS[order.scanner as keyof typeof SCANNER_LABELS] || 'scanner'} portal`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </button>

                        {/* Status progression */}
                        {order.status === 'NEW' && (
                          <button
                            onClick={() => updateStatus(order.id, 'DOWNLOADED')}
                            className="rounded p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                            title="Mark as downloaded"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                          </button>
                        )}
                        {(order.status === 'LINKED') && (
                          <button
                            onClick={() => updateStatus(order.id, 'COMPLETED')}
                            className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                            title="Mark as completed"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
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

      {/* Info Banner */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Workflow</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</span>
            Receive notification
          </span>
          <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</span>
            Log order here
          </span>
          <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-[10px] font-bold text-yellow-700">3</span>
            Download from portal
          </span>
          <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">4</span>
            Link to case
          </span>
          <svg className="h-3 w-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          <span className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">5</span>
            Complete
          </span>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Future: Once the iTero Lab Connector API is configured, scanner orders will be created automatically from incoming scans.
        </p>
      </div>

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Log Scanner Order</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddOrder} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Scanner Type</label>
                    <select
                      value={formScanner}
                      onChange={(e) => setFormScanner(e.target.value)}
                      className={inputClass}
                    >
                      {SCANNER_TYPES.map((s) => (
                        <option key={s} value={s}>{SCANNER_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Order / Rx Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formOrderNumber}
                      onChange={(e) => setFormOrderNumber(e.target.value)}
                      placeholder="e.g. 290008481"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Patient Name</label>
                  <input
                    type="text"
                    value={formPatientName}
                    onChange={(e) => setFormPatientName(e.target.value)}
                    placeholder="From the scanner notification"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Doctor Name</label>
                    <input
                      type="text"
                      value={formDoctorName}
                      onChange={(e) => setFormDoctorName(e.target.value)}
                      placeholder="Referring dentist"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Clinic Name</label>
                    <input
                      type="text"
                      value={formClinicName}
                      onChange={(e) => setFormClinicName(e.target.value)}
                      placeholder="Referring clinic"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Any additional details"
                    className={inputClass}
                    rows={2}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Log Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link to Case Modal */}
      {showLinkModal && linkingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Link to Case</h2>
                <p className="text-xs text-gray-500">Order #{linkingOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => { setShowLinkModal(false); setLinkingOrder(null) }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className={labelClass}>Search for a case</label>
                <input
                  type="text"
                  value={caseSearch}
                  onChange={(e) => searchCases(e.target.value)}
                  placeholder="Search by case number, patient name, clinic..."
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {loadingCases ? (
                  <p className="py-4 text-center text-sm text-gray-500">Searching...</p>
                ) : caseOptions.length === 0 && caseSearch.length >= 2 ? (
                  <p className="py-4 text-center text-sm text-gray-500">No cases found</p>
                ) : (
                  <div className="space-y-1">
                    {caseOptions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => linkToCase(c.id)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:bg-brand-50 hover:border-brand-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{c.caseNumber}</span>
                          <span className="text-xs text-gray-400">{c.clinic.name}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {c.patient
                            ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.reference
                            : 'No patient'}
                          {' '}&middot;{' '}{c.dentist.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <Link
                  href="/lab/cases/new"
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create New Case
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
