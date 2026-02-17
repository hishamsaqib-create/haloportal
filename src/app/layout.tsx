import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/shared/auth-provider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Halo Lab Portal',
  description: 'Lab management platform for Halo Lab',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
