'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function InviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const res = await fetch('/api/users/invite', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    if (res.ok) {
      router.push('/auth/login?message=Account created. Please sign in.')
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to accept invite')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Invalid Invite</h1>
        <p className="mt-2 text-gray-600">This invite link is invalid or has expired.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand-950">Halo Lab</h1>
        <p className="mt-2 text-gray-600">Set up your account</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Minimum 8 characters"
            required
            minLength={8}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Repeat your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Setting up...' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}

export default function InviteAcceptPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
        <InviteForm />
      </Suspense>
    </div>
  )
}
