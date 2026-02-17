'use client'

import { useSession, signOut } from 'next-auth/react'

export function TopBar() {
  const { data: session } = useSession()

  return (
    <header className="fixed top-0 right-0 left-64 z-20 flex h-14 items-center justify-between border-b border-gray-200/60 bg-white/70 backdrop-blur-xl px-6">
      <div />
      <div className="flex items-center gap-3">
        {session?.user && (
          <>
            <div className="text-right">
              <p className="text-[13px] font-semibold text-gray-900">{session.user.name}</p>
              <p className="text-[11px] text-gray-500 font-medium">{session.user.role.replace(/_/g, ' ')}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-white">
                {session.user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="ml-1 rounded-lg border border-gray-200/80 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
