import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { CASE_STATUS_LABELS, DEPARTMENT_LABELS, PRIORITY_LABELS, canViewFinancials } from '@/lib/constants'
import Link from 'next/link'

export default async function PatientDetailPage({
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
  const showFinancials = canViewFinancials(session.user.role)

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      cases: {
        include: {
          clinic: { select: { id: true, name: true } },
          dentist: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!patient) notFound()

  const patientName = [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.initials || patient.reference
  const totalCases = patient.cases.length
  const activeCases = patient.cases.filter((c) => !['COMPLETED', 'CANCELLED'].includes(c.status)).length
  const totalValue = patient.cases.reduce((sum, c) => sum + c.items.reduce((s, i) => s + (i.lineTotal || 0), 0), 0)

  // Get unique clinics and dentists
  const clinicMap = new Map<string, string>()
  const dentistMap = new Map<string, string>()
  patient.cases.forEach((c) => {
    clinicMap.set(c.clinic.id, c.clinic.name)
    dentistMap.set(c.dentist.id, c.dentist.name)
  })

  return (
    <div>
      {/* Back + Header */}
      <div className="mb-6">
        <Link href="/lab/patients" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          All Patients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              <span className="font-mono">{patient.reference}</span>
              {patient.dob && <span>DOB: {patient.dob}</span>}
              {patient.initials && patientName !== patient.initials && (
                <span>Initials: {patient.initials}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total Cases</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{totalCases}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Active Cases</p>
          <p className={`mt-1 text-xl font-bold ${activeCases > 0 ? 'text-blue-700' : 'text-gray-900'}`}>{activeCases}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Clinics</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{clinicMap.size}</p>
        </div>
        {showFinancials && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total Value</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
          </div>
        )}
      </div>

      {/* Treating Clinics / Dentists */}
      {(clinicMap.size > 0 || dentistMap.size > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Clinics</h3>
            <div className="space-y-2">
              {Array.from(clinicMap.entries()).map(([cId, cName]) => (
                <Link key={cId} href={`/lab/clinics/${cId}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-700 transition-colors">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                  </svg>
                  {cName}
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Dentists</h3>
            <div className="space-y-2">
              {Array.from(dentistMap.entries()).map(([dId, dName]) => (
                <Link key={dId} href={`/lab/dentists/${dId}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-700 transition-colors">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  {dName}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {patient.notes && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Notes</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{patient.notes}</p>
        </div>
      )}

      {/* Cases Table */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Case History</h2>
            <p className="text-xs text-gray-400">{totalCases} case{totalCases !== 1 ? 's' : ''} on record</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Case</th>
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dept</th>
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Items</th>
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Clinic / Dentist</th>
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Priority</th>
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Due</th>
                {showFinancials && (
                  <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Value</th>
                )}
                <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patient.cases.length === 0 ? (
                <tr>
                  <td colSpan={showFinancials ? 9 : 8} className="px-6 py-16 text-center">
                    <p className="text-sm text-gray-500">No cases found for this patient.</p>
                  </td>
                </tr>
              ) : (
                patient.cases.map((c) => {
                  const caseValue = c.items.reduce((s, i) => s + (i.lineTotal || 0), 0)
                  const itemSummary = c.items.map((i) => i.product?.name || i.description).join(', ')
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/lab/cases/${c.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                          {c.caseNumber}
                        </Link>
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
                      <td className="px-6 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={itemSummary}>
                        {itemSummary || '\u2014'}
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-gray-900">{c.clinic.name}</div>
                        <div className="text-xs text-gray-400">{c.dentist.name}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                          c.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                          c.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS] || c.status}
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
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {c.dueDate ? formatDate(c.dueDate) : '\u2014'}
                      </td>
                      {showFinancials && (
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(caseValue)}
                        </td>
                      )}
                      <td className="px-6 py-3 text-sm text-gray-400">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
