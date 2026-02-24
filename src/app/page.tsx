'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

interface DentistSession {
  id: string
  name: string
  email: string | null
  clinicId: string
  clinicName: string
  allowCeramics: boolean
  allowDsd: boolean
  allowAppliances: boolean
}

interface RecentCase {
  id: string
  caseNumber: string
  department: string
  status: string
  dueDate: string
  createdAt: string
  patient: { firstName: string | null; lastName: string | null; initials: string | null } | null
}

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

const DENTIST_STATUS: Record<string, string> = {
  NEW: 'Submitted',
  REVIEWED: 'In Progress',
  IN_PRODUCTION: 'In Progress',
  SENT_OUTSOURCE: 'In Progress',
  RECEIVED: 'In Progress',
  QC: 'In Progress',
  READY: 'In Progress',
  DISPATCHED: 'With Courier',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const DEPT_LABELS: Record<string, string> = {
  CERAMICS: 'Ceramics',
  DSD: 'DSD',
  APPLIANCES: 'Appliances',
}

const SPARKLE_POSITIONS = [
  { x: '20%', y: '35%', delay: '0.3s', size: 3 },
  { x: '30%', y: '28%', delay: '0.5s', size: 4 },
  { x: '38%', y: '40%', delay: '0.4s', size: 2 },
  { x: '45%', y: '32%', delay: '0.7s', size: 5 },
  { x: '52%', y: '45%', delay: '0.6s', size: 3 },
  { x: '35%', y: '50%', delay: '0.8s', size: 2 },
  { x: '55%', y: '38%', delay: '0.9s', size: 4 },
  { x: '42%', y: '55%', delay: '1.0s', size: 3 },
  { x: '60%', y: '42%', delay: '0.5s', size: 2 },
  { x: '48%', y: '30%', delay: '1.1s', size: 3 },
  { x: '25%', y: '48%', delay: '0.7s', size: 4 },
  { x: '65%', y: '50%', delay: '0.9s', size: 2 },
]

function HaloAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Shooting star */}
      <div
        className="halo-shooting-star"
        style={{ top: '50%', left: '50%' }}
      />

      {/* Flash burst at center */}
      <div className="halo-flash" />

      {/* Expanding halo rings */}
      <div className="halo-ring" />
      <div className="halo-ring-inner" />

      {/* Sparkle particles */}
      {SPARKLE_POSITIONS.map((s, i) => (
        <div
          key={i}
          className="halo-sparkle"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            animation: `sparkle 1.2s ease-out ${s.delay} forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  )
}

function getFirstName(fullName: string): string {
  const titleRegex = /^(dr\.?|mr\.?|mrs\.?|ms\.?|miss|prof\.?)\s+/i
  const stripped = fullName.replace(titleRegex, '')
  return stripped.split(' ')[0] || fullName
}

export default function PublicHomePage() {
  const [dentist, setDentist] = useState<DentistSession | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const [recentCases, setRecentCases] = useState<RecentCase[]>([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [showHalo, setShowHalo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Session restore
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('halo-dentist')
      if (stored) {
        try {
          setDentist(JSON.parse(stored))
        } catch { /* ignore */ }
      }
    }
  }, [])

  // Load recent cases when dentist is set
  useEffect(() => {
    if (!dentist) return
    setCasesLoading(true)
    fetch(`/api/public/dentist-cases?dentistId=${dentist.id}`)
      .then(res => res.json())
      .then(data => setRecentCases(data.data || []))
      .catch(() => {})
      .finally(() => setCasesLoading(false))
  }, [dentist])

  // Word rotation
  useEffect(() => {
    if (!dentist) return
    const interval = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
        setWordVisible(true)
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
  }, [dentist])

  // Auto-focus
  useEffect(() => {
    if (!dentist && inputRef.current) inputRef.current.focus()
  }, [dentist])

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
      if (data.success && data.dentist) {
        sessionStorage.setItem('halo-dentist', JSON.stringify(data.dentist))
        setShowHalo(true)
        setDentist(data.dentist)
        // Auto-sign into next-auth for dentist portal access
        if (data.dentist.email) {
          signIn('credentials', {
            email: data.dentist.email,
            password: password.trim(),
            redirect: false,
          }).catch(() => {})
        }
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

  function handleLogout() {
    sessionStorage.removeItem('halo-dentist')
    setDentist(null)
    setPassword('')
    setRecentCases([])
  }

  const hasAnyForm = dentist && (dentist.allowDsd || dentist.allowCeramics || dentist.allowAppliances)

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white">
      {/* Halo animation on login */}
      {showHalo && <HaloAnimation onComplete={() => setShowHalo(false)} />}

      {/* Ambient halo glow (persists after animation) */}
      {dentist && <div className="halo-ambient-glow" />}

      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-100/40 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">

        {/* PASSWORD GATE */}
        {!dentist && (
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
                  placeholder="Enter your password"
                  className="w-80 rounded-2xl border border-gray-200 bg-white py-4 pl-11 pr-4 text-base text-gray-900 placeholder-gray-400 outline-none shadow-sm transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button type="submit" disabled={checking || !password.trim()}
                className="w-80 rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                {checking ? 'Verifying...' : 'Enter'}
              </button>
              {error && <p className="text-sm text-red-500 animate-fade-in">{error}</p>}
            </form>

            <div className="mt-16">
              <Link href="/portal" className="text-sm text-gray-400 transition-colors hover:text-blue-500 no-underline hover:no-underline">
                Lab Portal
              </Link>
            </div>
          </div>
        )}

        {/* MAIN CONTENT (after password) */}
        {dentist && (
          <div className="flex flex-col items-center animate-fade-in w-full max-w-3xl">
            {/* Dentist badge + portal link + sign out */}
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
                {dentist.clinicName}
              </span>
              <Link
                href="/dentist/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-800 no-underline hover:no-underline"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                Dentist Portal
              </Link>
              <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Sign out
              </button>
            </div>

            {/* Personal welcome */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Welcome to Halo, <span className="text-blue-500">{getFirstName(dentist.name)}</span>
              </h1>
            </div>

            {/* Rotating headline */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-medium text-gray-400 sm:text-3xl">We make</span>
                <div className="h-[40px] sm:h-[45px] flex items-center justify-center overflow-hidden min-w-[160px] sm:min-w-[200px]">
                  <span
                    className={`block text-2xl font-bold tracking-tight text-blue-500 sm:text-3xl transition-all duration-500 ease-out ${
                      wordVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
                    }`}
                  >
                    {ROTATING_WORDS[wordIndex]}
                  </span>
                </div>
                <span className="text-2xl font-medium text-gray-400 sm:text-3xl">Effortless</span>
              </div>
            </div>

            {/* Form buttons */}
            {hasAnyForm && (
              <div className="flex flex-col gap-4 w-full max-w-2xl mb-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Submit a Case</p>

                {dentist.allowDsd && (
                  <Link href="/dsd"
                    className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-8 py-5 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 active:scale-[0.99] no-underline hover:no-underline">
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
                )}

                {dentist.allowCeramics && (
                  <Link href="/ceramics"
                    className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-8 py-5 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 active:scale-[0.99] no-underline hover:no-underline">
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
                )}

                {dentist.allowAppliances && (
                  <Link href="/appliances"
                    className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-8 py-5 text-lg font-semibold text-gray-900 shadow-sm transition-all hover:shadow-md hover:border-blue-200 hover:bg-blue-50/50 active:scale-[0.99] no-underline hover:no-underline">
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
                )}
              </div>
            )}

            {/* My Cases section */}
            <div className="w-full max-w-2xl">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h2 className="text-sm font-semibold text-gray-900">My Recent Cases</h2>
                </div>
                {casesLoading ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">Loading cases...</div>
                ) : recentCases.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-500">
                    No cases yet. Submit your first case above.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recentCases.map((c) => {
                      const patientName = c.patient
                        ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || ''
                        : ''
                      return (
                        <div key={c.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{c.caseNumber}</span>
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                {DEPT_LABELS[c.department] || c.department}
                              </span>
                              <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-medium ${
                                DENTIST_STATUS[c.status] === 'Delivered' ? 'bg-green-50 text-green-700' :
                                DENTIST_STATUS[c.status] === 'With Courier' ? 'bg-indigo-50 text-indigo-700' :
                                DENTIST_STATUS[c.status] === 'Cancelled' ? 'bg-red-50 text-red-700' :
                                DENTIST_STATUS[c.status] === 'Submitted' ? 'bg-gray-100 text-gray-600' :
                                'bg-blue-50 text-blue-700'
                              }`}>
                                {DENTIST_STATUS[c.status] || c.status}
                              </span>
                            </div>
                            {patientName && (
                              <p className="text-xs text-gray-500 mt-0.5">{patientName}</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Portal link */}
            <div className="mt-10">
              <Link href="/portal" className="text-sm text-gray-400 transition-colors hover:text-blue-500 no-underline hover:no-underline">
                Lab Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
