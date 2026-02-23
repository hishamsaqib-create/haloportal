import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import { CASE_STATUS_LABELS, DEPARTMENT_LABELS, CASE_STATUSES } from '@/lib/constants'
import Link from 'next/link'

export default async function DentistCaseDetailPage({ params }: { params: { id: string } }) {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session || session.user.userType !== 'DENTIST') redirect('/auth/login')

  const caseData = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      clinic: true,
      dentist: true,
      patient: true,
      items: { include: { product: true } },
      outsourceOrders: { include: { referralCentre: true } },
      emailThreads: { include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } } },
      prescriptions: { orderBy: { version: 'desc' } },
      remakes: true,
    },
  })

  if (!caseData) notFound()
  if (caseData.dentistId !== session.user.dentistId) redirect('/dentist/dashboard')

  const statusIndex = CASE_STATUSES.indexOf(caseData.status as any)
  const itemsTotal = caseData.items.reduce((sum, i) => sum + i.lineTotal, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dentist/cases" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          &larr; Back to cases
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{caseData.caseNumber}</h1>
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700">
            {CASE_STATUS_LABELS[caseData.status as keyof typeof CASE_STATUS_LABELS]}
          </span>
          <span className="text-sm text-gray-500">
            {DEPARTMENT_LABELS[caseData.department as keyof typeof DEPARTMENT_LABELS]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Status Timeline</h2>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {CASE_STATUSES.filter(s => s !== 'CANCELLED').map((s, i) => {
                const isCurrent = s === caseData.status
                const isPast = statusIndex >= 0 && CASE_STATUSES.indexOf(s) < statusIndex
                return (
                  <div key={s} className="flex items-center">
                    <div className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      isCurrent ? 'bg-brand-700 text-white' :
                      isPast ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {CASE_STATUS_LABELS[s]}
                    </div>
                    {i < CASE_STATUSES.length - 2 && (
                      <div className={`h-0.5 w-4 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Items */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Teeth</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Material</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Shade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {caseData.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{item.toothNumbers || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{item.material || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{item.shade || '—'}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-600">{item.qty}</td>
                    <td className="px-6 py-3 text-right text-sm text-gray-900">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={5} className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total</td>
                  <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(itemsTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Communications */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Communications</h2>
            {caseData.emailThreads.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet</p>
            ) : (
              <div className="space-y-4">
                {caseData.emailThreads.flatMap(t => t.messages).map((msg) => (
                  <div key={msg.id} className={`rounded-lg p-4 ${
                    msg.direction === 'OUTBOUND' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {msg.direction === 'OUTBOUND' ? 'Lab' : msg.fromAddress}
                      </span>
                      <span className="text-xs text-gray-500">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.bodyText || 'HTML email'}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href={`/dentist/messages?case=${caseData.id}`}
                className="text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Send a message about this case
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Clinic</dt>
                <dd className="text-sm text-gray-900">{caseData.clinic.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Patient</dt>
                <dd className="text-sm text-gray-900">{caseData.patient ? [caseData.patient.firstName, caseData.patient.lastName].filter(Boolean).join(' ') || caseData.patient.initials || caseData.patient.reference : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Due Date</dt>
                <dd className="text-sm text-gray-900">{formatDate(caseData.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDate(caseData.createdAt)}</dd>
              </div>
              {caseData.notes && (
                <div>
                  <dt className="text-xs text-gray-500">Notes</dt>
                  <dd className="text-sm text-gray-900">{caseData.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Prescriptions */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">DAMAS Prescriptions</h3>
            {caseData.prescriptions.length === 0 ? (
              <p className="text-sm text-gray-500">No prescriptions generated</p>
            ) : (
              <ul className="space-y-2">
                {caseData.prescriptions.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">v{p.version} — {formatDate(p.generatedAt)}</span>
                    <button className="text-xs font-medium text-brand-700 hover:text-brand-800">
                      Download PDF
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Outsourcing */}
          {caseData.outsourceOrders.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Outsourcing</h3>
              <ul className="space-y-2">
                {caseData.outsourceOrders.map((o) => (
                  <li key={o.id} className="text-sm">
                    <span className="text-gray-900">{o.referralCentre.name}</span>
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      o.status === 'RECEIVED' ? 'bg-green-50 text-green-700' :
                      o.status === 'SENT' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
