import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency, getDueStatus, formatRelative } from '@/lib/utils'
import { CASE_STATUS_LABELS, DEPARTMENT_LABELS, PRIORITY_LABELS, DELIVERY_STATUS_LABELS, DELIVERY_METHOD_LABELS, canViewFinancials, type DeliveryStatus, type DeliveryMethod } from '@/lib/constants'
import Link from 'next/link'

export default async function LabDashboard() {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session) redirect('/auth/login')

  const showFinancials = canViewFinancials(session.user.role)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const in48h = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalCases,
    activeCases,
    overdueCases,
    dueTodayCases,
    dueSoonCases,
    recentCases,
    outsourcePending,
    unpaidInvoices,
    remakeCount,
    casesNewToday,
    completedThisMonth,
    deptBreakdown,
    recentActivity,
    clinicCount,
    dentistCount,
    deliveriesPending,
    deliveriesInTransit,
    deliveredToday,
    recentDeliveries,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    prisma.case.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: todayStart },
      },
    }),
    prisma.case.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { gte: todayStart, lt: todayEnd },
      },
    }),
    prisma.case.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { gte: todayEnd, lt: in48h },
      },
    }),
    prisma.case.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { clinic: true, dentist: true, patient: true },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 20,
    }),
    prisma.outsourceOrder.count({ where: { status: { in: ['QUEUED', 'SENT'] } } }),
    prisma.invoice.aggregate({
      where: { status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.remake.count({
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.case.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.case.count({
      where: { status: 'COMPLETED', updatedAt: { gte: monthStart } },
    }),
    prisma.case.groupBy({
      by: ['department'],
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      _count: true,
    }),
    prisma.auditLog.findMany({
      include: { user: { select: { name: true } }, case: { select: { caseNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.clinic.count({ where: { active: true } }),
    prisma.dentist.count({ where: { active: true } }),
    // Delivery stats
    prisma.delivery.count({ where: { status: { in: ['PENDING', 'COLLECTED'] } } }),
    prisma.delivery.count({ where: { status: 'IN_TRANSIT' } }),
    prisma.delivery.count({ where: { status: 'DELIVERED', deliveredAt: { gte: todayStart } } }),
    prisma.delivery.findMany({
      where: { status: { in: ['PENDING', 'COLLECTED', 'IN_TRANSIT'] } },
      include: {
        clinic: { select: { name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  // Calculate urgency: cases that are overdue or due today
  const urgentCases = recentCases.filter((c) => {
    const due = getDueStatus(c.dueDate)
    return due === 'overdue' || due === 'today'
  })

  const deptMap: Record<string, number> = {}
  deptBreakdown.forEach((d) => {
    deptMap[d.department] = d._count
  })

  return (
    <div>
      {/* Header with greeting and quick actions */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}&middot;{' '}
            {activeCases} active cases across {clinicCount} clinics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/lab/cases/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Case
          </Link>
        </div>
      </div>

      {/* Urgency Alert Banner */}
      {(overdueCases > 0 || dueTodayCases > 0) && (
        <div className={`mb-6 rounded-2xl border p-4 ${overdueCases > 0 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${overdueCases > 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
              <svg className={`h-5 w-5 ${overdueCases > 0 ? 'text-red-600' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${overdueCases > 0 ? 'text-red-800' : 'text-orange-800'}`}>
                {overdueCases > 0 && `${overdueCases} overdue case${overdueCases !== 1 ? 's' : ''}`}
                {overdueCases > 0 && dueTodayCases > 0 && ' and '}
                {dueTodayCases > 0 && `${dueTodayCases} case${dueTodayCases !== 1 ? 's' : ''} due today`}
              </p>
              <p className={`text-xs ${overdueCases > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                Immediate attention required
              </p>
            </div>
            <Link
              href="/lab/cases?status=overdue"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                overdueCases > 0
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              View Cases
            </Link>
          </div>
        </div>
      )}

      {/* Primary Stats - Key Numbers */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard title="Active Cases" value={activeCases} href="/lab/cases?status=active" icon="cases" />
        <StatCard title="Due Today" value={dueTodayCases} href="/lab/cases?due=today" icon="today" variant={dueTodayCases > 0 ? 'warning' : 'default'} />
        <StatCard title="Overdue" value={overdueCases} href="/lab/cases?status=overdue" icon="overdue" variant={overdueCases > 0 ? 'danger' : 'default'} />
        <StatCard title="Due in 48h" value={dueSoonCases} href="/lab/cases?due=soon" icon="clock" variant={dueSoonCases > 0 ? 'info' : 'default'} />
      </div>

      {/* Secondary Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <MiniStat title="New Today" value={casesNewToday} />
        <MiniStat title="Completed (Month)" value={completedThisMonth} />
        <MiniStat title="Outsource Pending" value={outsourcePending} href="/lab/outsourcing" />
        <MiniStat title="Deliveries Pending" value={deliveriesPending + deliveriesInTransit} subtitle={`${deliveriesInTransit} in transit`} href="/lab/deliveries" />
        {showFinancials && <MiniStat title="Outstanding AR" value={formatCurrency(unpaidInvoices._sum.total || 0)} subtitle={`${unpaidInvoices._count} inv`} href="/lab/invoices?status=unpaid" />}
        <MiniStat title="Remakes (Month)" value={remakeCount} href="/lab/remakes" />
      </div>

      {/* Two-column layout: Cases table + Sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main - Cases Table */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Active Cases</h2>
                <p className="text-xs text-gray-400">{activeCases} cases in progress</p>
              </div>
              <Link href="/lab/cases" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                View all &rarr;
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Case</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Patient</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Clinic / Dentist</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dept</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Due</th>
                    <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentCases.map((c) => {
                    const dueStatus = getDueStatus(c.dueDate)
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                            {c.caseNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {c.patient ? (
                            <Link href={`/lab/patients/${c.patient.id}`} className="hover:text-brand-700 hover:underline">
                              {[c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference}
                            </Link>
                          ) : '\u2014'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-sm text-gray-900">{c.clinic.name}</div>
                          <div className="text-xs text-gray-400">{c.dentist.name}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                            c.department === 'CERAMICS' ? 'bg-blue-50 text-blue-700' :
                            c.department === 'APPLIANCES' ? 'bg-purple-50 text-purple-700' :
                            'bg-teal-50 text-teal-700'
                          }`}>
                            {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS] || c.department}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-sm ${
                            dueStatus === 'overdue' ? 'font-semibold text-red-600' :
                            dueStatus === 'today' ? 'font-semibold text-orange-600' :
                            dueStatus === 'tomorrow' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {c.dueDate ? formatDate(c.dueDate) : '\u2014'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            c.priority === 'URGENT' ? 'bg-red-50 text-red-700' :
                            c.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            {PRIORITY_LABELS[c.priority as keyof typeof PRIORITY_LABELS] || c.priority}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {recentCases.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                          </svg>
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-700">No active cases</p>
                        <p className="mt-1 text-xs text-gray-400">Cases from your JotForm or manually created will appear here.</p>
                        <Link href="/lab/cases/new" className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
                          Create your first case &rarr;
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Department Breakdown */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Cases by Department</h3>
            <div className="space-y-3">
              {(['CERAMICS', 'APPLIANCES', 'DSD'] as const).map((dept) => {
                const count = deptMap[dept] || 0
                const pct = activeCases > 0 ? (count / activeCases) * 100 : 0
                const colors = {
                  CERAMICS: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700' },
                  APPLIANCES: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
                  DSD: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700' },
                }
                return (
                  <div key={dept}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {DEPARTMENT_LABELS[dept]}
                      </span>
                      <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ${colors[dept].light} ${colors[dept].text}`}>
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full ${colors[dept].bg} transition-all duration-500`}
                        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Active Deliveries */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Active Deliveries</h3>
              <Link href="/lab/deliveries" className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors">
                View all &rarr;
              </Link>
            </div>
            {recentDeliveries.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-400">No active deliveries</p>
                <Link href="/lab/deliveries/new" className="mt-1 inline-block text-xs font-medium text-brand-700 hover:text-brand-800">
                  Create delivery &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentDeliveries.map((del) => (
                  <Link
                    key={del.id}
                    href={`/lab/deliveries/${del.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 transition-all hover:border-gray-200 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-xs font-medium text-gray-900">{del.clinic.name}</p>
                      <p className="text-[10px] text-gray-400">{del.items.length} case{del.items.length !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      del.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                      del.status === 'COLLECTED' ? 'bg-blue-50 text-blue-700' :
                      'bg-indigo-50 text-indigo-700'
                    }`}>
                      {DELIVERY_STATUS_LABELS[del.status as DeliveryStatus] || del.status}
                    </span>
                  </Link>
                ))}
                {deliveredToday > 0 && (
                  <p className="pt-1 text-center text-[10px] text-green-600 font-medium">
                    {deliveredToday} delivered today
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/lab/cases/new" label="New Case" icon="plus" />
              <QuickAction href="/lab/deliveries/new" label="Dispatch" icon="truck" />
              {showFinancials && <QuickAction href="/lab/invoices" label="Invoices" icon="invoice" />}
              <QuickAction href="/lab/outsourcing" label="Outsource" icon="send" />
              <QuickAction href="/lab/prescriptions" label="Prescriptions" icon="clipboard" />
              {showFinancials && <QuickAction href="/lab/reporting" label="Reports" icon="chart" />}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <ActivityIcon action={log.action} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">{log.user?.name || 'System'}</span>
                        {' '}
                        <span className="text-gray-500">{formatAction(log.action)}</span>
                        {log.case && (
                          <>
                            {' '}
                            <Link href={`/lab/cases/${log.case}`} className="font-medium text-brand-700 hover:underline">
                              {log.case.caseNumber}
                            </Link>
                          </>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">{formatRelative(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lab Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Lab Summary</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Total Cases</span>
                <span className="text-sm font-semibold text-gray-900">{totalCases}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Active Clinics</span>
                <span className="text-sm font-semibold text-gray-900">{clinicCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Active Dentists</span>
                <span className="text-sm font-semibold text-gray-900">{dentistCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Remake Rate (Month)</span>
                <span className={`text-sm font-semibold ${remakeCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {completedThisMonth > 0 ? ((remakeCount / completedThisMonth) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  href,
  icon,
  variant = 'default',
}: {
  title: string
  value: string | number
  href?: string
  icon: string
  variant?: 'default' | 'danger' | 'warning' | 'info'
}) {
  const colors = {
    default: 'border-gray-200 bg-white',
    danger: 'border-red-200 bg-red-50',
    warning: 'border-orange-200 bg-orange-50',
    info: 'border-blue-200 bg-blue-50',
  }
  const valueColors = {
    default: 'text-gray-900',
    danger: 'text-red-700',
    warning: 'text-orange-700',
    info: 'text-blue-700',
  }
  const iconColors = {
    default: 'bg-gray-100 text-gray-500',
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-orange-100 text-orange-600',
    info: 'bg-blue-100 text-blue-600',
  }

  const Wrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`flex items-center gap-3.5 rounded-2xl border p-4 transition-all hover:shadow-sm ${colors[variant]}`}
    >
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconColors[variant]}`}>
        <StatIcon type={icon} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <p className={`text-xl font-bold ${valueColors[variant]}`}>{value}</p>
      </div>
    </Wrapper>
  )
}

function MiniStat({
  title,
  value,
  subtitle,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  href?: string
}) {
  const Wrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className="rounded-xl border border-gray-100 bg-white px-4 py-3 transition-all hover:border-gray-200 hover:shadow-sm"
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{title}</p>
      <p className="mt-0.5 text-lg font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
    </Wrapper>
  )
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2.5 text-sm font-medium text-gray-700 transition-all hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900"
    >
      <QuickActionIcon type={icon} />
      {label}
    </Link>
  )
}

function StatIcon({ type }: { type: string }) {
  const cls = 'h-5 w-5'
  switch (type) {
    case 'cases':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>
    case 'today':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
    case 'overdue':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
    case 'clock':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" /></svg>
  }
}

function QuickActionIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 text-gray-400'
  switch (type) {
    case 'plus':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
    case 'invoice':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
    case 'send':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
    case 'message':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
    case 'clipboard':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
    case 'chart':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
    case 'truck':
      return <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
    default:
      return null
  }
}

function ActivityIcon({ action }: { action: string }) {
  const cls = 'h-3 w-3'
  if (action === 'CREATED') return <svg className={`${cls} text-green-500`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
  if (action === 'STATUS_CHANGE') return <svg className={`${cls} text-blue-500`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
  if (action.includes('EMAIL')) return <svg className={`${cls} text-purple-500`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
  return <svg className={`${cls} text-gray-400`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5" /></svg>
}

function formatAction(action: string): string {
  switch (action) {
    case 'CREATED': return 'created'
    case 'UPDATED': return 'updated'
    case 'STATUS_CHANGE': return 'changed status on'
    case 'DELETED': return 'deleted'
    case 'EMAIL_SENT': return 'sent email for'
    case 'INVOICE_GENERATED': return 'generated invoice for'
    default: return action.toLowerCase().replace(/_/g, ' ')
  }
}
