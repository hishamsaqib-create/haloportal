import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import { CASE_STATUS_LABELS, canViewFinancials } from '@/lib/constants'
import Link from 'next/link'
import { ClinicEditForm } from './clinic-edit-form'
import { DentistList } from './dentist-list'
import { ArchiveClinicButtonClient } from './archive-clinic-button'

export default async function ClinicDetailPage({
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
  const showFinancials = canViewFinancials(session.user.role)

  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab || 'overview'

  const clinic = await prisma.clinic.findUnique({
    where: { id },
    include: {
      dentists: {
        orderBy: { name: 'asc' },
      },
      _count: {
        select: {
          dentists: true,
          cases: true,
          invoices: true,
        },
      },
    },
  })

  if (!clinic) notFound()

  // Fetch tab-specific data
  const [cases, invoices, emailThreads, billingStats, unpaidStats] = await Promise.all([
    activeTab === 'overview' || activeTab === 'cases'
      ? prisma.case.findMany({
          where: { clinicId: id },
          include: {
            dentist: { select: { id: true, name: true } },
            patient: { select: { reference: true, initials: true } },
            items: { select: { lineTotal: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: activeTab === 'overview' ? 20 : 50,
        })
      : Promise.resolve([]),
    (activeTab === 'overview' || activeTab === 'invoices') && showFinancials
      ? prisma.invoice.findMany({
          where: { clinicId: id },
          include: {
            dentist: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: activeTab === 'overview' ? 10 : 50,
        })
      : Promise.resolve([]),
    activeTab === 'correspondence'
      ? prisma.emailThread.findMany({
          where: {
            case: { clinicId: id },
          },
          include: {
            case: { select: { id: true, caseNumber: true, dentist: { select: { name: true } } } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 30,
        })
      : Promise.resolve([]),
    showFinancials
      ? prisma.invoice.aggregate({
          where: { clinicId: id },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve({ _sum: { total: null }, _count: 0 }),
    showFinancials
      ? prisma.invoice.aggregate({
          where: { clinicId: id, status: { in: ['SENT', 'OVERDUE'] } },
          _sum: { total: true },
          _count: true,
        })
      : Promise.resolve({ _sum: { total: null }, _count: 0 }),
  ])

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'cases', label: `Cases (${clinic._count.cases})` },
    { key: 'dentists', label: `Dentists (${clinic._count.dentists})` },
    ...(showFinancials
      ? [{ key: 'invoices', label: `Invoices (${clinic._count.invoices})` }]
      : []),
    { key: 'correspondence', label: 'Correspondence' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/lab/clinics" className="hover:text-brand-700">Clinics</Link>
        <span>/</span>
        <span className="text-gray-900">{clinic.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                clinic.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {clinic.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              {clinic.email && <span>{clinic.email}</span>}
              {clinic.phone && <span>{clinic.phone}</span>}
            </div>
            {clinic.address && (
              <p className="mt-1 text-sm text-gray-500">{clinic.address}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ArchiveClinicButton clinicId={clinic.id} active={clinic.active} />
          </div>
        </div>

        {/* Stats */}
        <div className={`mt-5 grid gap-4 border-t border-gray-100 pt-5 ${showFinancials ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Dentists</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{clinic._count.dentists}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Total Cases</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{clinic._count.cases}</p>
          </div>
          {showFinancials && (
            <>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Total Billed</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatCurrency(billingStats._sum.total || 0)}
                </p>
                <p className="text-xs text-gray-500">{billingStats._count} invoices</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Outstanding</p>
                <p className="mt-1 text-xl font-bold text-orange-700">
                  {formatCurrency(unpaidStats._sum.total || 0)}
                </p>
                <p className="text-xs text-gray-500">{unpaidStats._count} unpaid</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/lab/clinics/${id}?tab=${t.key}`}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Cases */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Cases</h2>
              <Link href={`/lab/clinics/${id}?tab=cases`} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                View all &rarr;
              </Link>
            </div>
            {cases.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">No cases yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cases.slice(0, 10).map((c) => {
                  const total = c.items.reduce((sum, i) => sum + i.lineTotal, 0)
                  return (
                    <div key={c.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                            {c.caseNumber}
                          </Link>
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                            c.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                            c.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {c.patient ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference : '\u2014'}
                          {' \u00b7 '}
                          {c.dentist.name}
                        </p>
                      </div>
                      <div className="text-right">
                        {showFinancials && (
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(total)}</p>
                        )}
                        <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dentists & Recent Invoices */}
          <div className="space-y-6">
            {/* Dentists summary */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Dentists ({clinic._count.dentists})</h2>
                <Link href={`/lab/clinics/${id}?tab=dentists`} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                  Manage &rarr;
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {clinic.dentists.filter(d => d.active).slice(0, 8).map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <Link href={`/lab/dentists/${d.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {d.name}
                      </Link>
                      {d.email && <p className="text-xs text-gray-500">{d.email}</p>}
                    </div>
                    {d.gdcNumber && (
                      <span className="text-xs text-gray-400">GDC: {d.gdcNumber}</span>
                    )}
                  </div>
                ))}
                {clinic.dentists.filter(d => d.active).length === 0 && (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">No active dentists.</div>
                )}
              </div>
            </div>

            {/* Recent Invoices */}
            {showFinancials && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
                  <Link href={`/lab/clinics/${id}?tab=invoices`} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                    View all &rarr;
                  </Link>
                </div>
                {invoices.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">No invoices yet.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {invoices.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50">
                        <div>
                          <Link href={`/lab/invoices/${inv.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                            {inv.invoiceNo}
                          </Link>
                          <p className="text-xs text-gray-500">Due {formatDate(inv.dueDate)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            inv.status === 'PAID' ? 'bg-green-50 text-green-700' :
                            inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                            inv.status === 'SENT' ? 'bg-blue-50 text-blue-700' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {inv.status}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cases Tab */}
      {activeTab === 'cases' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Case #</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Patient</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dentist</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Due Date</th>
                  {showFinancials && (
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Value</th>
                  )}
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={showFinancials ? 7 : 6} className="px-6 py-16 text-center text-sm text-gray-500">
                      No cases found for this clinic.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const total = c.items.reduce((sum, i) => sum + i.lineTotal, 0)
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                            {c.caseNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {c.patient ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference : '\u2014'}
                        </td>
                        <td className="px-6 py-3">
                          <Link href={`/lab/dentists/${c.dentist.id}`} className="text-sm text-gray-900 hover:underline">
                            {c.dentist.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                            c.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                            c.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                            c.status === 'IN_PRODUCTION' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{formatDate(c.dueDate)}</td>
                        {showFinancials && (
                          <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(total)}
                          </td>
                        )}
                        <td className="px-6 py-3 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dentists Tab */}
      {activeTab === 'dentists' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">All Dentists</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {clinic.dentists.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500">No dentists for this clinic.</div>
            ) : (
              clinic.dentists.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/lab/dentists/${d.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {d.name}
                      </Link>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        d.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {d.active ? 'Active' : 'Archived'}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      {d.email && <span>{d.email}</span>}
                      {d.phone && <span>{d.phone}</span>}
                      {d.gdcNumber && <span>GDC: {d.gdcNumber}</span>}
                    </div>
                  </div>
                  <Link
                    href={`/lab/dentists/${d.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    View Account
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && showFinancials && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Invoice #</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dentist</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Period</th>
                  <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Subtotal</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">VAT</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-gray-500">
                      No invoices found for this clinic.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/lab/invoices/${inv.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {inv.dentist ? (
                          <Link href={`/lab/dentists/${inv.dentist.id}`} className="hover:underline">
                            {inv.dentist.name}
                          </Link>
                        ) : '\u2014'}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          inv.status === 'PAID' ? 'bg-green-50 text-green-700' :
                          inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                          inv.status === 'SENT' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">{formatCurrency(inv.subtotal)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">{formatCurrency(inv.vatAmount)}</td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(inv.total)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correspondence Tab */}
      {activeTab === 'correspondence' && (
        <div className="space-y-4">
          {emailThreads.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">No correspondence yet</p>
              <p className="mt-1 text-xs text-gray-400">Email threads linked to this clinic&apos;s cases will appear here.</p>
            </div>
          ) : (
            emailThreads.map((thread) => {
              const lastMsg = thread.messages[0]
              return (
                <div key={thread.id} className="rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-gray-900">{thread.subject}</h3>
                        {thread.case && (
                          <Link
                            href={`/lab/cases/${thread.case.id}`}
                            className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 hover:text-brand-700"
                          >
                            {thread.case.caseNumber}
                          </Link>
                        )}
                        {thread.case?.dentist && (
                          <span className="text-xs text-gray-400">{thread.case.dentist.name}</span>
                        )}
                      </div>
                      {lastMsg && (
                        <div className="mt-1.5">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className={`inline-flex rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${
                              lastMsg.direction === 'OUTBOUND'
                                ? 'bg-brand-50 text-brand-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {lastMsg.direction === 'OUTBOUND' ? 'Sent' : 'Received'}
                            </span>
                            <span>{lastMsg.fromAddress}</span>
                            <span className="text-gray-300">&rarr;</span>
                            <span>{lastMsg.toAddress}</span>
                          </div>
                          {lastMsg.bodyText && (
                            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{lastMsg.bodyText}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {formatDateTime(thread.updatedAt)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ClinicEditForm
            clinic={{
              id: clinic.id,
              name: clinic.name,
              email: clinic.email,
              phone: clinic.phone,
              address: clinic.address,
              billingName: clinic.billingName,
              billingAddress: clinic.billingAddress,
              billingEmail: clinic.billingEmail,
              vatNumber: clinic.vatNumber,
              paymentTermDays: clinic.paymentTermDays,
              notes: clinic.notes,
              active: clinic.active,
            }}
          />
          <DentistList
            dentists={clinic.dentists.map(d => ({
              id: d.id,
              name: d.name,
              email: d.email,
              gdcNumber: d.gdcNumber,
              active: d.active,
            }))}
          />
        </div>
      )}
    </div>
  )
}

function ArchiveClinicButton({ clinicId, active }: { clinicId: string; active: boolean }) {
  return <ArchiveClinicButtonClient clinicId={clinicId} active={active} />
}
