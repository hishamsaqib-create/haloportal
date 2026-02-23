import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_METHOD_LABELS,
  CASE_STATUS_LABELS,
  DEPARTMENT_LABELS,
  canViewFinancials,
  type DeliveryStatus,
  type DeliveryMethod,
} from '@/lib/constants'
import Link from 'next/link'
import { DeliveryActions } from './delivery-actions'

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session) redirect('/auth/login')
  const showFinancials = canViewFinancials(session.user.role)

  const { id } = await params

  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      clinic: { select: { id: true, name: true, address: true, phone: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      items: {
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              department: true,
              status: true,
              priority: true,
              dueDate: true,
              patient: { select: { id: true, reference: true, firstName: true, lastName: true, initials: true } },
              dentist: { select: { id: true, name: true } },
              items: { select: { id: true, description: true, qty: true, lineTotal: true } },
            },
          },
        },
      },
    },
  })

  if (!delivery) notFound()

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    COLLECTED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_TRANSIT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DELIVERED: 'bg-green-50 text-green-700 border-green-200',
    FAILED: 'bg-red-50 text-red-700 border-red-200',
  }

  const totalValue = delivery.items.reduce(
    (sum, item) => sum + item.case.items.reduce((s, ci) => s + ci.lineTotal, 0),
    0
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Link href="/lab/deliveries" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              &larr; Deliveries
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{delivery.deliveryNumber}</h1>
          <div className="mt-1 flex items-center gap-3">
            <span className={`inline-flex rounded-full border px-3 py-0.5 text-xs font-semibold ${statusColors[delivery.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
              {DELIVERY_STATUS_LABELS[delivery.status as DeliveryStatus] || delivery.status}
            </span>
            <span className="text-sm text-gray-500">
              {DELIVERY_METHOD_LABELS[delivery.method as DeliveryMethod] || delivery.method}
            </span>
            <span className="text-sm text-gray-400">
              {delivery.items.length} case{delivery.items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <DeliveryActions deliveryId={delivery.id} currentStatus={delivery.status} />
      </div>

      {/* Status Timeline */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Delivery Progress</h3>
        <div className="flex items-center gap-0">
          {(['PENDING', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED'] as const).map((status, index, arr) => {
            const statuses = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED']
            const currentIndex = statuses.indexOf(delivery.status)
            const stepIndex = index
            const isCompleted = stepIndex < currentIndex
            const isCurrent = delivery.status === status
            const isFailed = delivery.status === 'FAILED'

            return (
              <div key={status} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      isFailed && isCurrent
                        ? 'bg-red-100 text-red-700'
                        : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : isCurrent
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`mt-1.5 text-[10px] font-medium ${
                    isCompleted || isCurrent ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {DELIVERY_STATUS_LABELS[status]}
                  </span>
                </div>
                {index < arr.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 rounded ${
                    stepIndex < currentIndex ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cases in this delivery */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Cases ({delivery.items.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Case</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Patient</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dentist</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dept</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Items</th>
                    {showFinancials && <th className="px-6 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Value</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {delivery.items.map((item) => {
                    const caseValue = item.case.items.reduce((s, ci) => s + ci.lineTotal, 0)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`/lab/cases/${item.case.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                            {item.case.caseNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {item.case.patient ? [item.case.patient.firstName, item.case.patient.lastName].filter(Boolean).join(' ') || item.case.patient.initials || item.case.patient.reference : '\u2014'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {item.case.dentist.name}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                            item.case.department === 'CERAMICS' ? 'bg-blue-50 text-blue-700' :
                            item.case.department === 'APPLIANCES' ? 'bg-purple-50 text-purple-700' :
                            'bg-teal-50 text-teal-700'
                          }`}>
                            {DEPARTMENT_LABELS[item.case.department as keyof typeof DEPARTMENT_LABELS] || item.case.department}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            {CASE_STATUS_LABELS[item.case.status as keyof typeof CASE_STATUS_LABELS] || item.case.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {item.case.items.length} item{item.case.items.length !== 1 ? 's' : ''}
                        </td>
                        {showFinancials && (
                          <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(caseValue)}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                {showFinancials && (
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={6} className="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(totalValue)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Delivery Details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Delivery Details</h3>
            <div className="space-y-3">
              <DetailRow label="Method" value={DELIVERY_METHOD_LABELS[delivery.method as DeliveryMethod] || delivery.method} />
              <DetailRow label="Tracking Ref" value={delivery.trackingRef || '\u2014'} />
              <DetailRow label="Driver" value={delivery.driverName || '\u2014'} />
              <DetailRow label="Est. Delivery" value={formatDate(delivery.estimatedDate)} />
              <DetailRow label="Dispatched" value={formatDateTime(delivery.dispatchedAt)} />
              <DetailRow label="Delivered" value={formatDateTime(delivery.deliveredAt)} />
              <DetailRow label="Created" value={formatDateTime(delivery.createdAt)} />
              <DetailRow label="Created By" value={delivery.createdBy?.name || '\u2014'} />
            </div>
          </div>

          {/* Clinic Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Clinic</h3>
            <div className="space-y-3">
              <div>
                <Link href={`/lab/clinics/${delivery.clinic.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  {delivery.clinic.name}
                </Link>
              </div>
              {delivery.clinic.address && (
                <p className="text-sm text-gray-600">{delivery.clinic.address}</p>
              )}
              {delivery.clinic.phone && (
                <p className="text-sm text-gray-500">{delivery.clinic.phone}</p>
              )}
              {delivery.clinic.email && (
                <p className="text-sm text-gray-500">{delivery.clinic.email}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {delivery.notes && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{delivery.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
