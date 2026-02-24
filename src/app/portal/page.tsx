'use client'

import { Suspense, useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

function PortalLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get('callbackUrl')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setLoading(false)
      setError('Invalid email or password')
      return
    }

    if (callbackUrl) {
      router.push(callbackUrl)
      return
    }

    const session = await getSession()
    if (session?.user?.userType === 'DENTIST') {
      router.push('/dentist/dashboard')
    } else if (session?.user?.userType === 'CLINIC') {
      router.push('/clinic/dashboard')
    } else {
      router.push('/lab/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 p-3.5 text-[13px] text-red-700 border border-red-100 font-medium">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-[14px] placeholder-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[13px] font-semibold text-gray-700 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-[14px] placeholder-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200"
          placeholder="Enter your password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 shadow-sm"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in...
          </span>
        ) : 'Sign In'}
      </button>
    </form>
  )
}

export default function PortalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
      <div className="w-full max-w-sm px-6">
        <div className="mb-10 flex flex-col items-center">
          <Logo variant="full" className="h-16 w-auto mb-4" color="#1d1d1f" />
          <p className="text-[14px] text-gray-500 font-medium">Sign in to your portal</p>
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-sm border border-gray-200/60">
          <Suspense fallback={<div className="py-12 text-center text-[13px] text-gray-400">Loading...</div>}>
            <PortalLoginForm />
          </Suspense>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link href="/" className="text-[12px] text-gray-400 hover:text-blue-500 transition-colors no-underline">
            &larr; Back to dentist submission page
          </Link>
          <p className="text-[11px] text-gray-400">
            Halo Dental Lab Portal v2.0
          </p>
        </div>
      </div>
    </div>
  )
}
