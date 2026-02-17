'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface InvoiceRow {
  id: string
  invoiceNo: string
  periodStart: string | null
  periodEnd: string | null
  status: string
  subtotal: number
  vatAmount: number
  total: number
  dueDate: string | null
  paidDate: string | null
  createdAt: string
}

interface StatementRow {
  id: string
  periodStart: string
  periodEnd: string
  totalDue: number
  status: string
  createdAt: string
}

export default function DentistBillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [statements, setStatements] = useState<StatementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'invoices' | 'statements'>('invoices')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [invRes, stmtRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/statements'),
      ])
      if (invRes.ok) {
        const data = await invRes.json()
        setInvoices(data.invoices || [])
      }
      if (stmtRes.ok) {
        const data = await stmtRes.json()
        setStatements(data.statements || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const totalOutstanding = invoices
    .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500">Your invoices and statements</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Invoices</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{invoices.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {invoices.filter((i) => i.status === 'OVERDUE').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab('invoices')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'invoices' ? 'border-brand-700 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Invoices
        </button>
        <button
          onClick={() => setTab('statements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'statements' ? 'border-brand-700 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Statements
        </button>
      </div>

      {tab === 'invoices' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Subtotal</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">VAT</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">No invoices yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{inv.invoiceNo}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {inv.periodStart && inv.periodEnd
                        ? `${formatDate(inv.periodStart)} - ${formatDate(inv.periodEnd)}`
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        inv.status === 'PAID' ? 'bg-green-50 text-green-700' :
                        inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                        inv.status === 'SENT' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-600">{formatCurrency(inv.subtotal)}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-600">{formatCurrency(inv.vatAmount)}</td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-3">
                      <button className="text-xs font-medium text-brand-700 hover:text-brand-800">
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'statements' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Total Due</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : statements.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">No statements yet</td></tr>
              ) : (
                statements.map((stmt) => (
                  <tr key={stmt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {formatDate(stmt.periodStart)} - {formatDate(stmt.periodEnd)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        stmt.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {stmt.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(stmt.totalDue)}</td>
                    <td className="px-6 py-3">
                      <button className="text-xs font-medium text-brand-700 hover:text-brand-800">Download</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
