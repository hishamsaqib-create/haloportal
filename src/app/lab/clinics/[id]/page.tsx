import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CASE_STATUS_LABELS } from '@/lib/constants'
import Link from 'next/link'
import { ClinicEditForm } from './clinic-edit-form'

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session) redirect('/auth/login')

  const { id } = await params

  const clinic = await prisma.clinic.findUnique({
    where: { id },
    include: {
      dentists: {
        orderBy: { name: 'asc' },
      },
      cases: {
        include: {
          dentist: { select: { name: true } },
          patient: { select: { reference: true, initials: true } },
          items: { select: { lineTotal: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
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

  // Billing summary
  const billingStats = await prisma.invoice.aggregate({
    where: { clinicId: id },
    _sum: { total: true },
    _count: true,
  })

  const unpaidStats = await prisma.invoice.aggregate({
    where: { clinicId: id, status: { in: ['SENT', 'OVERDUE'] } },
    _sum: { total: true },
    _count: true,
  })

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/lab/clinics" className="hover:text-brand-700">
          Clinics
        </Link>
        <span>/</span>
        <span className="text-gray-900">{clinic.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  clinic.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
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
          <InviteButton />
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Dentists</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{clinic._count.dentists}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-400">Total Cases</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{clinic._count.cases}</p>
          </div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Edit Form + Dentists */}
        <div className="space-y-6">
          {/* Edit Clinic */}
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

          {/* Dentists */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Dentists ({clinic.dentists.length})
              </h2>
            </div>
            {clinic.dentists.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No dentists registered for this clinic.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {clinic.dentists.map((dentist) => (
                  <div key={dentist.id} className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-900">{dentist.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-500">
                      {dentist.email && <span>{dentist.email}</span>}
                      {dentist.gdcNumber && <span>GDC: {dentist.gdcNumber}</span>}
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          dentist.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {dentist.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Cases + Invoices */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Cases */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Cases</h2>
              <Link
                href={`/lab/cases?clinicId=${clinic.id}`}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                View all
              </Link>
            </div>
            {clinic.cases.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">No cases yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Case</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Patient</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Dentist</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Status</th>
                      <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-400">Value</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clinic.cases.map((c) => {
                      const total = c.items.reduce((sum, i) => sum + i.lineTotal, 0)
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-6 py-2">
                            <Link
                              href={`/lab/cases/${c.id}`}
                              className="text-sm font-medium text-brand-700 hover:underline"
                            >
                              {c.caseNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-600">
                            {c.patient?.initials || c.patient?.reference || '---'}
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-600">{c.dentist.name}</td>
                          <td className="px-6 py-2">
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-right text-sm text-gray-900">
                            {formatCurrency(total)}
                          </td>
                          <td className="px-6 py-2 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Invoices</h2>
              <Link
                href={`/lab/invoices?clinicId=${clinic.id}`}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                View all
              </Link>
            </div>
            {clinic.invoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">No invoices yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Invoice</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Status</th>
                      <th className="px-6 py-2 text-right text-xs font-medium uppercase text-gray-400">Total</th>
                      <th className="px-6 py-2 text-left text-xs font-medium uppercase text-gray-400">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clinic.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-2">
                          <Link
                            href={`/lab/invoices/${inv.id}`}
                            className="text-sm font-medium text-brand-700 hover:underline"
                          >
                            {inv.invoiceNo}
                          </Link>
                        </td>
                        <td className="px-6 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              inv.status === 'PAID'
                                ? 'bg-green-50 text-green-700'
                                : inv.status === 'OVERDUE'
                                ? 'bg-red-50 text-red-700'
                                : inv.status === 'SENT'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="px-6 py-2 text-sm text-gray-600">{formatDate(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InviteButton() {
  return (
    <Link
      href="#invite"
      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      Invite Clinic Admin
    </Link>
  )
}
