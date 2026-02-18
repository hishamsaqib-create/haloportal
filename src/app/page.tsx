'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Rotating words
// ---------------------------------------------------------------------------

const ROTATING_WORDS = [
  'Smile Design',
  'Veneers',
  'Crowns',
  'Bridges',
  'Appliances',
  'Implants',
  'Retainers',
  'Aligners',
]

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PublicHomePage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Session restore
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('halo-auth') === 'true') {
      setAuthenticated(true)
    }
  }, [])

  // Word rotation
  useEffect(() => {
    if (!authenticated) return
    const interval = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
        setWordVisible(true)
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
  }, [authenticated])

  // Auto-focus
  useEffect(() => {
    if (!authenticated && inputRef.current) inputRef.current.focus()
  }, [authenticated])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim() || checking) return
    setChecking(true)
    setError('')
    try {
      const res = await fetch('/api/public/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        sessionStorage.setItem('halo-auth', 'true')
        setAuthenticated(true)
      } else {
        setError('Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setChecking(false)
    }
  }, [password, checking])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white">
      {/* Subtle decorative circles */}
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">

        {/* ===== PASSWORD GATE ===== */}
        {!authenticated && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="mb-12">
              <h1 className="text-center text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                halo<span className="text-blue-500">lab</span>
              </h1>
              <p className="mt-3 text-center text-sm text-gray-400 tracking-[0.2em] uppercase">
                Dental Laboratory
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter password"
                  className="w-80 rounded-2xl border border-gray-200 bg-white py-4 pl-11 pr-4 text-base text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button type="submit" disabled={checking || !password.trim()}
                className="w-80 rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                {checking ? 'Verifying...' : 'Enter'}
              </button>
              {error && <p className="text-sm text-red-500 animate-fade-in">{error}</p>}
            </form>

            {/* Login links */}
            <div className="mt-16 flex items-center gap-6">
              <Link href="/auth/login" className="text-sm text-gray-400 transition-colors hover:text-blue-500 no-underline hover:no-underline">
                Lab Portal
              </Link>
              <span className="text-gray-200">|</span>
              <Link href="/auth/login" className="text-sm text-gray-400 transition-colors hover:text-blue-500 no-underline hover:no-underline">
                Dentist Portal
              </Link>
            </div>
          </div>
        )}

        {/* ===== MAIN CONTENT (after password) ===== */}
        {authenticated && (
          <div className="flex flex-col items-center animate-fade-in">
            {/* Rotating headline */}
            <div className="mb-8 text-center">
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                We make
              </h1>
              <div className="my-5 h-[70px] sm:h-[85px] lg:h-[100px] flex items-center justify-center overflow-hidden">
                <span
                  className={`block text-5xl font-bold tracking-tight text-blue-500 sm:text-6xl lg:text-7xl transition-all duration-500 ease-out ${
                    wordVisible
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-6 opacity-0'
                  }`}
                >
                  {ROTATING_WORDS[wordIndex]}
                </span>
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                Effortless
              </h1>
            </div>

            <p className="mb-14 max-w-lg text-center text-lg text-gray-500 leading-relaxed">
              Premium dental laboratory services delivered with precision and care
            </p>

            {/* Three form buttons — large and prominent */}
            <div className="flex flex-col gap-5 w-full max-w-2xl">
              <Link href="/dsd"
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-8 py-6 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 active:scale-[0.99] no-underline hover:no-underline">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                  </svg>
                </div>
                <div>
                  <span className="block">Submit Design Case</span>
                  <span className="block text-sm font-normal text-gray-400">DSD, smile design & wax-ups</span>
                </div>
                <svg className="ml-auto h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>

              <Link href="/ceramics"
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-8 py-6 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 active:scale-[0.99] no-underline hover:no-underline">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </div>
                <div>
                  <span className="block">Submit Ceramic Case</span>
                  <span className="block text-sm font-normal text-gray-400">Crowns, veneers, bridges & implants</span>
                </div>
                <svg className="ml-auto h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>

              <Link href="/appliances"
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-8 py-6 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 active:scale-[0.99] no-underline hover:no-underline">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
                  </svg>
                </div>
                <div>
                  <span className="block">Submit Appliance Case</span>
                  <span className="block text-sm font-normal text-gray-400">Retainers, guards & orthodontics</span>
                </div>
                <svg className="ml-auto h-5 w-5 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>

            {/* Login links */}
            <div className="mt-16 flex items-center gap-6">
              <Link href="/auth/login" className="text-sm text-gray-400 transition-colors hover:text-blue-500 no-underline hover:no-underline">
                Lab Portal
              </Link>
              <span className="text-gray-200">|</span>
              <Link href="/auth/login" className="text-sm text-gray-400 transition-colors hover:text-blue-500 no-underline hover:no-underline">
                Dentist Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
