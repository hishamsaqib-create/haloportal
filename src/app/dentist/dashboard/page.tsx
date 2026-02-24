import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate, formatCurrency, getDueStatus } from '@/lib/utils'
import { DEPARTMENT_LABELS, DENTIST_STATUS_MAP } from '@/lib/constants'
import Link from 'next/link'

export default async function DentistDashboard() {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session || session.user.userType !== 'DENTIST') redirect('/auth/login')

  const dentistId = session.user.dentistId!
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const in48h = new Date(todayStart.getTime() + 48 * 60 * 60 * 1000)

  const [
    activeCases,
    dueSoonCases,
    completedCases,
    recentCases,
    unpaidInvoices,
  ] = await Promise.all([
    prisma.case.count({
      where: { dentistId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),
    prisma.case.count({
      where: {
        dentistId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lte: in48h },
      },
    }),
    prisma.case.count({
      where: { dentistId, status: 'COMPLETED' },
    }),
    prisma.case.findMany({
      where: { dentistId, status: { notIn: ['CANCELLED'] } },
      include: { clinic: true, patient: true, items: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.invoice.aggregate({
      where: { dentistId, status: { in: ['SENT', 'OVERDUE'] } },
      _sum: { total: true },
      _count: true,
    }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {session.user.name}</h1>
        <p className="text-sm text-gray-500">Here is your latest case overview</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard title="Cases in Progress" value={activeCases} href="/dentist/cases?status=active" />
        <DashCard title="Due Soon" value={dueSoonCases} href="/dentist/cases?due=soon" variant="warning" />
        <DashCard title="Completed" value={completedCases} href="/dentist/cases?status=completed" variant="success" />
        <DashCard
          title="Outstanding Balance"
          value={formatCurrency(unpaidInvoices._sum.total || 0)}
          subtitle={`${unpaidInvoices._count} unpaid invoice${unpaidInvoices._count !== 1 ? 's' : ''}`}
          href="/dentist/billing"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Cases</h2>
          <Link href="/dentist/cases" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Dept</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCases.map((c) => {
                const dueStatus = getDueStatus(c.dueDate)
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {c.patient ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <Link href={`/dentist/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                        {c.caseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-gray-600">
                      {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS]}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        DENTIST_STATUS_MAP[c.status] === 'Delivered' ? 'bg-green-50 text-green-700' :
                        DENTIST_STATUS_MAP[c.status] === 'With Courier' ? 'bg-indigo-50 text-indigo-700' :
                        DENTIST_STATUS_MAP[c.status] === 'Cancelled' ? 'bg-red-50 text-red-700' :
                        DENTIST_STATUS_MAP[c.status] === 'Submitted' ? 'bg-gray-100 text-gray-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {DENTIST_STATUS_MAP[c.status] || c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-sm ${
                        dueStatus === 'overdue' ? 'font-semibold text-red-600' :
                        dueStatus === 'today' ? 'font-semibold text-orange-600' :
                        'text-gray-600'
                      }`}>
                        {formatDate(c.dueDate)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {c.items.length} item{c.items.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                )
              })}
              {recentCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No cases yet
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

function DashCard({
  title, value, subtitle, href, variant = 'default',
}: {
  title: string; value: string | number; subtitle?: string; href?: string
  variant?: 'default' | 'warning' | 'success'
}) {
  const colors = {
    default: 'border-gray-200',
    warning: 'border-orange-200 bg-orange-50',
    success: 'border-green-200 bg-green-50',
  }
  const Wrapper = href ? Link : 'div'
  return (
    <Wrapper href={href || ''} className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm ${colors[variant]}`}>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </Wrapper>
  )
}
