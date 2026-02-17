import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LabSidebar } from '@/components/lab/lab-sidebar'
import { TopBar } from '@/components/shared/top-bar'

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/auth/login')
  if (session.user.userType !== 'INTERNAL') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50">
      <LabSidebar />
      <TopBar />
      <main className="ml-64 pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
