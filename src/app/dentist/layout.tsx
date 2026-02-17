import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DentistSidebar } from '@/components/dentist/dentist-sidebar'
import { TopBar } from '@/components/shared/top-bar'

export default async function DentistLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/auth/login')
  if (session.user.userType !== 'DENTIST') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <DentistSidebar />
      <TopBar />
      <main className="ml-64 pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
