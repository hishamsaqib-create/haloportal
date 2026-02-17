'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { INVOICE_STATUSES } from '@/lib/constants'

interface Invoice {
  id: string
  invoiceNo: string
  status: string
  subtotal: number
  vatRate: number
  vatAmount: number
  total: number
  dueDate: string | null
  paidDate: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
  clinic: { id: string; name: string }
  dentist: { id: string; name: string } | null
  _count?: { lines: number }
}

interface Clinic {
  id: string
  name: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-600',
  SENT: 'bg-blue-50 text-blue-700',
  PAID: 'bg-green-50 text-green-700',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-50 text-gray-400',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)

  // Generate form state
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [genClinicId, setGenClinicId] = useState('')
  const [genPeriodStart, setGenPeriodStart] = useState('')
  const [genPeriodEnd, setGenPeriodEnd] = useState('')
  const [genVatRate, setGenVatRate] = useState(20)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [filterStatus])

  async function fetchInvoices() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    try {
      const res = await fetch(`/api/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function openGenerateModal() {
    setShowGenerate(true)
    setGenError(null)
    setGenClinicId('')
    setGenPeriodStart('')
    setGenPeriodEnd('')
    setGenVatRate(20)
    // Load clinics
    try {
      const res = await fetch('/api/clinics')
      if (res.ok) {
        const data = await res.json()
        setClinics(data.data || [])
      }
    } catch {
      // ignore
    }
  }

  async function generateInvoice(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: genClinicId,
          periodStart: genPeriodStart || undefined,
          periodEnd: genPeriodEnd || undefined,
          vatRate: genVatRate,
        }),
      })
      if (res.ok) {
        setShowGenerate(false)
        fetchInvoices()
      } else {
        const data = await res.json()
        setGenError(data.error || 'Failed to generate invoice')
      }
    } catch {
      setGenError('Failed to generate invoice')
    } finally {
      setGenerating(false)
    }
  }

  async function markAsPaid(invoiceId: string) {
    if (!confirm('Mark this invoice as paid?')) return
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidDate: new Date().toISOString() }),
      })
      if (res.ok) {
        fetchInvoices()
      }
    } catch {
      // ignore
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">Manage and generate invoices for clinics</p>
        </div>
        <button
          onClick={openGenerateModal}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Generate Invoice
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s] || s}
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
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dentist</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Subtotal</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">VAT</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    No invoices found. Generate your first invoice.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/lab/invoices/${inv.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">{inv.clinic.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{inv.dentist?.name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {inv.periodStart && inv.periodEnd
                        ? `${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[inv.status] || 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-600">
                      {formatCurrency(inv.vatAmount)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/lab/invoices/${inv.id}`}
                          className="text-sm font-medium text-brand-700 hover:text-brand-800"
                        >
                          View
                        </Link>
                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                          <button
                            onClick={() => markAsPaid(inv.id)}
                            className="text-sm font-medium text-green-700 hover:text-green-800"
                          >
                            Mark Paid
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

      {/* Generate Invoice Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Generate Invoice</h2>
              <button
                onClick={() => setShowGenerate(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={generateInvoice} className="p-6">
              {genError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {genError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clinic <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={genClinicId}
                    onChange={(e) => setGenClinicId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select clinic</option>
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                    <input
                      type="date"
                      value={genPeriodStart}
                      onChange={(e) => setGenPeriodStart(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                    <input
                      type="date"
                      value={genPeriodEnd}
                      onChange={(e) => setGenPeriodEnd(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    value={genVatRate}
                    onChange={(e) => setGenVatRate(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={100}
                    step={0.1}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
