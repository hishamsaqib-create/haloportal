import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime, formatCurrency, formatRelative } from '@/lib/utils'
import {
  CASE_STATUS_LABELS,
  DEPARTMENT_LABELS,
  PRIORITY_LABELS,
  CASE_STATUSES,
  REMAKE_REASON_LABELS,
  DEPARTMENT_STATUSES,
  type CaseStatus,
  type Department,
} from '@/lib/constants'
import Link from 'next/link'
import { CaseActions } from './case-actions'

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session) redirect('/auth/login')

  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab || 'details'

  const caseData = await prisma.case.findUnique({
    where: { id },
    include: {
      clinic: true,
      dentist: true,
      patient: true,
      items: {
        include: {
          product: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      outsourceOrders: {
        include: {
          referralCentre: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      emailThreads: {
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
      remakes: {
        include: {
          caseItem: { select: { id: true, description: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      prescriptions: {
        include: {
          generatedBy: { select: { id: true, name: true } },
        },
        orderBy: { version: 'desc' },
      },
      auditLogs: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!caseData) notFound()

  const department = caseData.department as Department
  const allowedStatuses = DEPARTMENT_STATUSES[department] || CASE_STATUSES
  const caseTotal = caseData.items.reduce((sum, i) => sum + i.lineTotal, 0)

  const statusColors: Record<string, string> = {
    NEW: 'bg-gray-100 text-gray-700 border-gray-300',
    REVIEWED: 'bg-blue-50 text-blue-700 border-blue-300',
    IN_PRODUCTION: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    SENT_OUTSOURCE: 'bg-purple-50 text-purple-700 border-purple-300',
    RECEIVED: 'bg-cyan-50 text-cyan-700 border-cyan-300',
    QC: 'bg-yellow-50 text-yellow-700 border-yellow-300',
    READY: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    DISPATCHED: 'bg-teal-50 text-teal-700 border-teal-300',
    COMPLETED: 'bg-green-50 text-green-700 border-green-300',
    CANCELLED: 'bg-red-50 text-red-700 border-red-300',
  }

  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-50 text-gray-600',
    NORMAL: 'bg-blue-50 text-blue-700',
    HIGH: 'bg-orange-50 text-orange-700',
    URGENT: 'bg-red-50 text-red-700',
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'items', label: `Items (${caseData.items.length})` },
    { key: 'outsourcing', label: `Outsourcing (${caseData.outsourceOrders.length})` },
    { key: 'communications', label: `Communications (${caseData.emailThreads.length})` },
    { key: 'remakes', label: `Remakes (${caseData.remakes.length})` },
    { key: 'audit', label: 'Audit Log' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/lab/cases" className="hover:text-brand-700">
          Cases
        </Link>
        <span>/</span>
        <span className="text-gray-900">{caseData.caseNumber}</span>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{caseData.caseNumber}</h1>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusColors[caseData.status] || 'bg-gray-50 text-gray-600'
                }`}
              >
                {CASE_STATUS_LABELS[caseData.status as CaseStatus] || caseData.status}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  priorityColors[caseData.priority] || 'bg-gray-50 text-gray-600'
                }`}
              >
                {PRIORITY_LABELS[caseData.priority as keyof typeof PRIORITY_LABELS] || caseData.priority}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span>
                <span className="font-medium text-gray-500">Department:</span>{' '}
                {DEPARTMENT_LABELS[department] || caseData.department}
              </span>
              <span>
                <span className="font-medium text-gray-500">Due:</span>{' '}
                <span
                  className={
                    caseData.dueDate && new Date(caseData.dueDate) < new Date()
                      ? 'font-semibold text-red-600'
                      : ''
                  }
                >
                  {formatDate(caseData.dueDate)}
                </span>
              </span>
              <span>
                <span className="font-medium text-gray-500">Created:</span>{' '}
                {formatDateTime(caseData.createdAt)}
              </span>
              <span>
                <span className="font-medium text-gray-500">Value:</span>{' '}
                {formatCurrency(caseTotal)}
              </span>
            </div>
          </div>
          <CaseActions
            caseId={caseData.id}
            currentStatus={caseData.status}
            department={caseData.department}
            allowedStatuses={allowedStatuses as unknown as string[]}
          />
        </div>

        {/* Patient / Clinic / Dentist Info */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Patient</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {caseData.patient?.initials || caseData.patient?.reference || 'Not assigned'}
            </p>
            {caseData.patient?.reference && (
              <p className="text-xs text-gray-500">Ref: {caseData.patient.reference}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Clinic</p>
            <Link
              href={`/lab/clinics/${caseData.clinic.id}`}
              className="mt-1 block text-sm font-medium text-brand-700 hover:underline"
            >
              {caseData.clinic.name}
            </Link>
            {caseData.clinic.email && (
              <p className="text-xs text-gray-500">{caseData.clinic.email}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Dentist</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{caseData.dentist.name}</p>
            {caseData.dentist.email && (
              <p className="text-xs text-gray-500">{caseData.dentist.email}</p>
            )}
          </div>
        </div>

        {/* Status Timeline */}
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="mb-3 text-xs font-medium uppercase text-gray-400">Status Timeline</p>
          <div className="flex flex-wrap items-center gap-1">
            {allowedStatuses.map((status, idx) => {
              const isCurrent = caseData.status === status
              const statusIdx = allowedStatuses.indexOf(caseData.status as CaseStatus)
              const isCompleted = idx < statusIdx
              const isCancelled = caseData.status === 'CANCELLED'

              return (
                <div key={status} className="flex items-center">
                  {idx > 0 && (
                    <div
                      className={`h-0.5 w-4 ${
                        isCompleted ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div
                    className={`flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      isCurrent && !isCancelled
                        ? 'bg-brand-700 text-white ring-2 ring-brand-200'
                        : isCurrent && isCancelled
                        ? 'bg-red-600 text-white ring-2 ring-red-200'
                        : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {CASE_STATUS_LABELS[status] || status}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/lab/cases/${id}?tab=${t.key}`}
              className={`whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Case Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Case Details</h3>
            <dl className="space-y-3">
              <DetailRow label="Case Number" value={caseData.caseNumber} />
              <DetailRow
                label="Department"
                value={DEPARTMENT_LABELS[department] || caseData.department}
              />
              <DetailRow
                label="Status"
                value={CASE_STATUS_LABELS[caseData.status as CaseStatus] || caseData.status}
              />
              <DetailRow
                label="Priority"
                value={PRIORITY_LABELS[caseData.priority as keyof typeof PRIORITY_LABELS] || caseData.priority}
              />
              <DetailRow label="Due Date" value={formatDate(caseData.dueDate)} />
              <DetailRow label="Created" value={formatDateTime(caseData.createdAt)} />
              <DetailRow label="Last Updated" value={formatDateTime(caseData.updatedAt)} />
              <DetailRow label="Source" value={caseData.source} />
              {caseData.externalRef && (
                <DetailRow label="External Ref" value={caseData.externalRef} />
              )}
              {caseData.notes && <DetailRow label="Notes" value={caseData.notes} />}
            </dl>
          </div>

          {/* Items Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">Items Summary</h3>
            {caseData.items.length === 0 ? (
              <p className="text-sm text-gray-500">No items on this case.</p>
            ) : (
              <div className="space-y-3">
                {caseData.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>Qty: {item.qty}</span>
                        {item.material && <span>Material: {item.material}</span>}
                        {item.shade && <span>Shade: {item.shade}</span>}
                        {item.toothNumbers && (
                          <span>
                            Teeth: {JSON.parse(item.toothNumbers).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.lineTotal)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <p className="text-sm font-semibold text-gray-700">Total</p>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(caseTotal)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Product</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tooth Numbers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Shade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {caseData.items.map((item) => {
                  const teeth = item.toothNumbers ? JSON.parse(item.toothNumbers) : []
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-gray-900">{item.description}</div>
                        {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {item.product?.name || '—'}
                        {item.product?.sku && (
                          <span className="ml-1 text-xs text-gray-400">({item.product.sku})</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center text-sm text-gray-900">{item.qty}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {teeth.length > 0 ? teeth.join(', ') : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.material || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.shade || '—'}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  )
                })}
                {caseData.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                      No items on this case.
                    </td>
                  </tr>
                )}
              </tbody>
              {caseData.items.length > 0 && (
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={7} className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Total
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(caseTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {activeTab === 'outsourcing' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Outsource Orders</h3>
          </div>
          {caseData.outsourceOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No outsource orders for this case.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Referral Centre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Sent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Expected Return</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actual Return</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Tracking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {caseData.outsourceOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {order.referralCentre.name}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            order.status === 'RETURNED'
                              ? 'bg-green-50 text-green-700'
                              : order.status === 'SENT'
                              ? 'bg-blue-50 text-blue-700'
                              : order.status === 'RECEIVED'
                              ? 'bg-cyan-50 text-cyan-700'
                              : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {order.status}
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
                      <td className="px-6 py-3 text-sm text-gray-500">{order.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="space-y-4">
          {caseData.emailThreads.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
              No email threads linked to this case.
            </div>
          ) : (
            caseData.emailThreads.map((thread) => (
              <div key={thread.id} className="rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">{thread.subject}</h3>
                  <p className="text-xs text-gray-500">
                    {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''} &middot;
                    Last updated {formatRelative(thread.updatedAt)}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {thread.messages.map((msg) => (
                    <div key={msg.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              msg.direction === 'OUTBOUND'
                                ? 'bg-brand-50 text-brand-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {msg.direction === 'OUTBOUND' ? 'Sent' : 'Received'}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{msg.fromAddress}</span>
                          <span className="text-xs text-gray-400">to {msg.toAddress}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{msg.subject}</p>
                      {msg.bodyText && (
                        <p className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
                          {msg.bodyText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'remakes' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Remakes</h3>
          </div>
          {caseData.remakes.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No remakes recorded for this case.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Details</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Cost Est.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {caseData.remakes.map((remake) => (
                    <tr key={remake.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {remake.caseItem?.description || 'General'}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          {REMAKE_REASON_LABELS[remake.reasonCode as keyof typeof REMAKE_REASON_LABELS] ||
                            remake.reasonCode}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{remake.reasonText || '—'}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-900">
                        {remake.costEstimate != null ? formatCurrency(remake.costEstimate) : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{remake.createdBy.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDateTime(remake.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Audit Log</h3>
          </div>
          {caseData.auditLogs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No audit entries for this case.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {caseData.auditLogs.map((log) => {
                const oldVal = log.oldValue ? JSON.parse(log.oldValue) : null
                const newVal = log.newValue ? JSON.parse(log.newValue) : null

                return (
                  <div key={log.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            log.action === 'STATUS_CHANGE'
                              ? 'bg-blue-50 text-blue-700'
                              : log.action === 'CREATED'
                              ? 'bg-green-50 text-green-700'
                              : log.action === 'DELETED'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-sm text-gray-900">
                          {log.user?.name || 'System'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                    </div>
                    {log.action === 'STATUS_CHANGE' && oldVal && newVal && (
                      <p className="mt-1 text-sm text-gray-600">
                        Changed status from{' '}
                        <span className="font-medium">
                          {CASE_STATUS_LABELS[oldVal.status as CaseStatus] || oldVal.status}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {CASE_STATUS_LABELS[newVal.status as CaseStatus] || newVal.status}
                        </span>
                      </p>
                    )}
                    {log.action !== 'STATUS_CHANGE' && newVal && (
                      <p className="mt-1 text-xs text-gray-500">
                        {JSON.stringify(newVal)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}
