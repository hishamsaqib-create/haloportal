import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { ClinicUserManager } from '@/components/clinic/clinic-user-manager'

export default async function ClinicUsersPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.userType !== 'CLINIC') redirect('/auth/login')
  if (session.user.role !== 'CLINIC_ADMIN') redirect('/clinic/dashboard')

  const clinicId = session.user.clinicId!

  const users = await prisma.user.findMany({
    where: { clinicId, userType: { in: ['CLINIC', 'DENTIST'] } },
    include: { dentist: true },
    orderBy: { name: 'asc' },
  })

  const pendingInvites = await prisma.userInvite.findMany({
    where: { clinicId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">Manage clinic staff portal access</p>
      </div>

      <ClinicUserManager
        users={users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          userType: u.userType,
          active: u.active,
          lastLogin: u.lastLogin?.toISOString() || null,
          dentistName: u.dentist?.name || null,
        }))}
        pendingInvites={pendingInvites.map(inv => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          userType: inv.userType,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
        }))}
        clinicId={clinicId}
      />
    </div>
  )
}
