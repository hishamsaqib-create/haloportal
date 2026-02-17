import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/shared/auth-provider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Halo Dental Lab',
  description: 'Lab management platform for Halo Dental Lab',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1d1d1f',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '500',
                borderRadius: '12px',
                padding: '12px 16px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
