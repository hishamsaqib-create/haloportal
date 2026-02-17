import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Redirect based on user type
  switch (session.user.userType) {
    case 'DENTIST':
      redirect('/dentist/dashboard')
    case 'CLINIC':
      redirect('/clinic/dashboard')
    default:
      redirect('/lab/dashboard')
  }
}
