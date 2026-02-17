import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency, getDueStatus } from '@/lib/utils'
import { CASE_STATUS_LABELS, DEPARTMENT_LABELS, PRIORITY_LABELS } from '@/lib/constants'
import Link from 'next/link'

export default async function LabDashboard() {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session) redirect('/auth/login')

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const in48h = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000)

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
      where: {
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
    }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of lab operations</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Cases" value={activeCases} href="/lab/cases?status=active" />
        <StatCard title="Overdue" value={overdueCases} href="/lab/cases?status=overdue" variant="danger" />
        <StatCard title="Due Today" value={dueTodayCases} href="/lab/cases?due=today" variant="warning" />
        <StatCard title="Due in 48h" value={dueSoonCases} href="/lab/cases?due=soon" variant="info" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Outsource Pending" value={outsourcePending} href="/lab/outsourcing" />
        <StatCard
          title="Outstanding AR"
          value={formatCurrency(unpaidInvoices._sum.total || 0)}
          subtitle={`${unpaidInvoices._count} invoices`}
          href="/lab/invoices?status=unpaid"
        />
        <StatCard title="Remakes (This Month)" value={remakeCount} href="/lab/remakes" />
      </div>

      {/* Due Imminently Panel */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Cases</h2>
          <Link href="/lab/cases" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic / Dentist</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCases.map((c) => {
                const dueStatus = getDueStatus(c.dueDate)
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {c.caseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {c.patient?.initials || c.patient?.reference || '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-900">{c.clinic.name}</div>
                      <div className="text-xs text-gray-500">{c.dentist.name}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-medium text-gray-600">
                        {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS] || c.department}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
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
                        {formatDate(c.dueDate)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.priority === 'URGENT' ? 'bg-red-50 text-red-700' :
                        c.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {PRIORITY_LABELS[c.priority as keyof typeof PRIORITY_LABELS] || c.priority}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {recentCases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No active cases. Create your first case to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  href,
  variant = 'default',
}: {
  title: string
  value: string | number
  subtitle?: string
  href?: string
  variant?: 'default' | 'danger' | 'warning' | 'info'
}) {
  const colors = {
    default: 'border-gray-200',
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

  const Wrapper = href ? Link : 'div'
  const wrapperProps = href ? { href } : {}

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm ${colors[variant]}`}
    >
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColors[variant]}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </Wrapper>
  )
}
