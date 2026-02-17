'use client'

import { useSession, signOut } from 'next-auth/react'

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="fixed top-0 right-0 left-64 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.role.replace(/_/g, ' ')}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
