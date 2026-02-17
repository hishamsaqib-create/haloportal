'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface InvoiceRow {
  id: string
  invoiceNo: string
  dentist: { name: string } | null
  periodStart: string | null
  periodEnd: string | null
  status: string
  subtotal: number
  vatAmount: number
  total: number
  dueDate: string | null
}

export default function ClinicBillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices || [])
      }
      setLoading(false)
    }
    load()
  }, [statusFilter])

  const totalOutstanding = invoices
    .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.total, 0)

  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500">Clinic invoices and financial overview</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Invoices</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Export CSV
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice #</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dentist</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Subtotal</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">VAT</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">No invoices</td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{inv.invoiceNo}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{inv.dentist?.name || 'Clinic-level'}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {inv.periodStart && inv.periodEnd ? `${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}` : '—'}
                </td>
                <td className="px-6 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    inv.status === 'PAID' ? 'bg-green-50 text-green-700' :
                    inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                    inv.status === 'SENT' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-600'
                  }`}>{inv.status}</span>
                </td>
                <td className="px-6 py-3 text-right text-sm text-gray-600">{formatCurrency(inv.subtotal)}</td>
                <td className="px-6 py-3 text-right text-sm text-gray-600">{formatCurrency(inv.vatAmount)}</td>
                <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                <td className="px-6 py-3">
                  <button className="text-xs font-medium text-brand-700 hover:text-brand-800">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
