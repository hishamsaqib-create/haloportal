'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatDate, formatCurrency } from '@/lib/utils'

interface SupplierInvoice {
  id: string
  supplierInvoiceNo: string
  status: string
  amount: number
  vatAmount: number
  total: number
  date: string
  dueDate: string | null
  paidDate: string | null
  paidAmount: number | null
  attachmentUrl: string | null
  notes: string | null
  case: { id: string; caseNumber: string; department: string } | null
}

interface OutsourceOrder {
  id: string
  caseId: string
  status: string
  sentAt: string | null
  expectedReturnDate: string | null
  actualReturnDate: string | null
  costAmount: number | null
  isPaid: boolean
  paidDate: string | null
  trackingRef: string | null
  notes: string | null
  case: {
    id: string
    caseNumber: string
    department: string
    status: string
    dueDate: string | null
    patient: { firstName: string | null; lastName: string | null; initials: string | null } | null
  }
}

interface ReferralCentre {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  rating: number | null
  defaultLeadTimeDays: number
  notes: string | null
}

export default function ReferralCentreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [centre, setCentre] = useState<ReferralCentre | null>(null)
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [orders, setOrders] = useState<OutsourceOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'orders' | 'invoices'>('orders')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [centreRes, invoiceRes, orderRes] = await Promise.all([
        fetch(`/api/referral-centres/${id}`),
        fetch(`/api/referral-centres/${id}/invoices`),
        fetch(`/api/referral-centres/${id}/orders`),
      ])
      if (centreRes.ok) { const d = await centreRes.json(); setCentre(d.data) }
      if (invoiceRes.ok) { const d = await invoiceRes.json(); setInvoices(d.data || []) }
      if (orderRes.ok) { const d = await orderRes.json(); setOrders(d.data || []) }
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  async function markInvoicePaid(invoiceId: string, amount: number) {
    try {
      const res = await fetch(`/api/referral-centres/${id}/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAmount: amount }),
      })
      if (res.ok) { loadData(); toast.success('Invoice marked as paid') }
    } catch { toast.error('Failed to update invoice') }
  }

  async function toggleOrderPaid(orderId: string, isPaid: boolean, costAmount?: number) {
    try {
      const res = await fetch(`/api/outsource-orders/${orderId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid, costAmount }),
      })
      if (res.ok) { loadData(); toast.success(isPaid ? 'Marked as paid' : 'Marked as unpaid') }
    } catch { toast.error('Failed to update payment') }
  }

  const totalSpent = orders.reduce((sum, o) => sum + (o.costAmount || 0), 0)
  const totalPaid = orders.filter(o => o.isPaid).reduce((sum, o) => sum + (o.costAmount || 0), 0)
  const totalOutstanding = totalSpent - totalPaid
  const invoiceTotal = invoices.reduce((sum, i) => sum + i.total, 0)
  const invoicePaid = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (i.paidAmount || i.total), 0)

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Loading...</p></div>
  if (!centre) return <div className="flex items-center justify-center py-20"><p className="text-sm text-gray-500">Centre not found</p></div>

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/lab/referral-centres" className="hover:text-brand-700">Referral Centres</Link>
        <span>/</span>
        <span className="text-gray-900">{centre.name}</span>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">{centre.name}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
          {centre.email && <span>{centre.email}</span>}
          {centre.phone && <span>{centre.phone}</span>}
          {centre.address && <span>{centre.address}</span>}
          {centre.rating != null && <span>Rating: {centre.rating}/10</span>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-green-600">Total Paid</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-3">
            <p className="text-xs text-orange-600">Outstanding</p>
            <p className="text-lg font-bold text-orange-700">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs text-blue-600">Invoices Total</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(invoiceTotal)}</p>
            <p className="text-[10px] text-blue-500">Paid: {formatCurrency(invoicePaid)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-4 border-b border-gray-200">
        <button onClick={() => setTab('orders')} className={`pb-3 text-sm font-medium border-b-2 ${tab === 'orders' ? 'border-brand-700 text-brand-700' : 'border-transparent text-gray-500'}`}>
          Outsource Orders ({orders.length})
        </button>
        <button onClick={() => setTab('invoices')} className={`pb-3 text-sm font-medium border-b-2 ${tab === 'invoices' ? 'border-brand-700 text-brand-700' : 'border-transparent text-gray-500'}`}>
          Supplier Invoices ({invoices.length})
        </button>
      </div>

      {tab === 'orders' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Case</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Expected Return</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={order.isPaid}
                      onChange={(e) => toggleOrderPaid(order.id, e.target.checked, order.costAmount || undefined)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/lab/cases/${order.case.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                      {order.case.caseNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {order.case.patient ? [order.case.patient.firstName, order.case.patient.lastName].filter(Boolean).join(' ') || order.case.patient.initials || '—' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === 'RETURNED' ? 'bg-green-50 text-green-700' :
                      order.status === 'SENT' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.sentAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.expectedReturnDate)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                    {order.costAmount != null ? formatCurrency(order.costAmount) : '—'}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">No outsource orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Case</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.supplierInvoiceNo}</td>
                  <td className="px-4 py-3">
                    {inv.case ? (
                      <Link href={`/lab/cases/${inv.case.id}`} className="text-sm text-brand-700 hover:underline">
                        {inv.case.caseNumber}
                      </Link>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.status === 'PAID' ? 'bg-green-50 text-green-700' :
                      inv.status === 'DISPUTED' ? 'bg-red-50 text-red-700' :
                      'bg-yellow-50 text-yellow-700'
                    }`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {inv.paidAmount != null ? formatCurrency(inv.paidAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status !== 'PAID' && (
                      <button
                        onClick={() => markInvoicePaid(inv.id, inv.total)}
                        className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">No supplier invoices</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
