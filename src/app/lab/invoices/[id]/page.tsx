import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { InvoiceActions } from './invoice-actions'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  SENT: 'bg-blue-50 text-blue-700 border-blue-300',
  PAID: 'bg-green-50 text-green-700 border-green-300',
  OVERDUE: 'bg-red-50 text-red-700 border-red-300',
  CANCELLED: 'bg-gray-50 text-gray-400 border-gray-200',
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const { id } = await params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      clinic: true,
      dentist: true,
      lines: {
        include: {
          case: { select: { id: true, caseNumber: true } },
          caseItem: { select: { id: true, description: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!invoice) notFound()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/lab/invoices" className="hover:text-brand-700">
          Invoices
        </Link>
        <span>/</span>
        <span className="text-gray-900">{invoice.invoiceNo}</span>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNo}</h1>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  STATUS_COLORS[invoice.status] || 'bg-gray-50 text-gray-600'
                }`}
              >
                {STATUS_LABELS[invoice.status] || invoice.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Created {formatDateTime(invoice.createdAt)}
            </p>
          </div>

          <InvoiceActions invoiceId={invoice.id} currentStatus={invoice.status} />
        </div>

        {/* Info Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Clinic</p>
            <Link
              href={`/lab/clinics/${invoice.clinic.id}`}
              className="mt-1 block text-sm font-medium text-brand-700 hover:underline"
            >
              {invoice.clinic.name}
            </Link>
            {invoice.clinic.billingAddress && (
              <p className="text-xs text-gray-500">{invoice.clinic.billingAddress}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Dentist</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {invoice.dentist?.name || 'All dentists'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Period</p>
            <p className="mt-1 text-sm text-gray-900">
              {invoice.periodStart && invoice.periodEnd
                ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
                : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Due Date</p>
            <p
              className={`mt-1 text-sm font-medium ${
                invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID'
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {formatDate(invoice.dueDate)}
            </p>
            {invoice.paidDate && (
              <p className="text-xs text-green-600">Paid: {formatDate(invoice.paidDate)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lines.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{line.description}</td>
                  <td className="px-6 py-3">
                    {line.case ? (
                      <Link
                        href={`/lab/cases/${line.case.id}`}
                        className="text-sm text-brand-700 hover:underline"
                      >
                        {line.case.caseNumber}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center text-sm text-gray-900">{line.qty}</td>
                  <td className="px-6 py-3 text-right text-sm text-gray-900">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
              {invoice.lines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    No line items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-col items-end gap-1">
            <div className="flex w-64 items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex w-64 items-center justify-between text-sm">
              <span className="text-gray-500">VAT ({invoice.vatRate}%)</span>
              <span className="text-gray-900">{formatCurrency(invoice.vatAmount)}</span>
            </div>
            <div className="flex w-64 items-center justify-between border-t border-gray-200 pt-1 text-sm">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}
