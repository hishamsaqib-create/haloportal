import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export default async function ClinicDentistsPage() {
  let session
  try {
    session = await getServerSession(authOptions)
  } catch {
    redirect('/auth/login')
  }
  if (!session || session.user.userType !== 'CLINIC') redirect('/auth/login')

  const clinicId = session.user.clinicId!

  const dentists = await prisma.dentist.findMany({
    where: { clinicId, active: true },
    include: {
      _count: { select: { cases: true } },
      cases: {
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        select: { id: true },
      },
      invoices: {
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        select: { total: true },
      },
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dentists</h1>
        <p className="text-sm text-gray-500">Dentists registered under your clinic</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dentists.map((d) => {
          const outstanding = d.invoices.reduce((sum, inv) => sum + inv.total, 0)
          return (
            <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{d.name}</h3>
                  {d.email && <p className="text-xs text-gray-500">{d.email}</p>}
                  {d.gdcNumber && <p className="text-xs text-gray-400">GDC: {d.gdcNumber}</p>}
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                  {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-xs text-gray-500">Total Cases</p>
                  <p className="text-lg font-semibold text-gray-900">{d._count.cases}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active</p>
                  <p className="text-lg font-semibold text-gray-900">{d.cases.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(outstanding)}</p>
                </div>
              </div>
            </div>
          )
        })}
        {dentists.length === 0 && (
          <div className="col-span-full rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">No dentists registered</p>
          </div>
        )}
      </div>
    </div>
  )
}
