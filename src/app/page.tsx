'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Bubble animation component
// ---------------------------------------------------------------------------

interface Bubble {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
}

function generateBubbles(count: number): Bubble[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 120,
    opacity: 0.08 + Math.random() * 0.15,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * -20,
  }))
}

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
// Main page component
// ---------------------------------------------------------------------------

export default function PublicHomePage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [popping, setPopping] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const [bubbles] = useState(() => generateBubbles(18))
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if already authenticated (session storage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('halo-auth')
      if (stored === 'true') {
        setAuthenticated(true)
      }
    }
  }, [])

  // Rotate words
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

  // Auto-focus password input
  useEffect(() => {
    if (!authenticated && inputRef.current) {
      inputRef.current.focus()
    }
  }, [authenticated])

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
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
        setPopping(true)
        sessionStorage.setItem('halo-auth', 'true')
        // Wait for pop animation, then reveal content
        setTimeout(() => {
          setAuthenticated(true)
          setPopping(false)
        }, 800)
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
    <div className="relative min-h-screen overflow-hidden bg-[#060613]">
      {/* Floating bubbles */}
      <div className="absolute inset-0 z-0">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={`absolute rounded-full transition-all ${popping ? 'duration-700' : ''}`}
            style={{
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              background: `radial-gradient(circle at 30% 30%, rgba(56, 142, 255, ${bubble.opacity + 0.1}), rgba(30, 90, 220, ${bubble.opacity}), transparent)`,
              animation: popping
                ? 'none'
                : `floatBubble ${bubble.duration}s ease-in-out ${bubble.delay}s infinite`,
              transform: popping
                ? `translate(${(bubble.x - 50) * 8}px, ${(bubble.y - 50) * 8}px) scale(${2 + Math.random() * 3})`
                : undefined,
              opacity: popping ? 0 : undefined,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-[#060613]/30 to-[#060613]/60" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">

        {/* Password gate */}
        {!authenticated && !popping && (
          <div className="flex flex-col items-center animate-fade-in">
            {/* Logo / brand */}
            <div className="mb-10">
              <h1 className="text-center text-4xl font-bold tracking-tight text-white sm:text-5xl">
                halo<span className="text-blue-400">lab</span>
              </h1>
              <p className="mt-2 text-center text-sm text-blue-200/40 tracking-widest uppercase">
                Dental Laboratory
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center gap-4">
              <div className="relative">
                {/* Lock icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-blue-300/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter password"
                  className="w-72 rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none backdrop-blur-sm transition-all focus:border-blue-400/40 focus:bg-white/8 focus:ring-1 focus:ring-blue-400/20"
                />
              </div>
              <button
                type="submit"
                disabled={checking || !password.trim()}
                className="w-72 rounded-2xl bg-blue-500/20 py-3 text-sm font-medium text-blue-300 backdrop-blur-sm transition-all hover:bg-blue-500/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed border border-blue-400/15"
              >
                {checking ? 'Verifying...' : 'Enter'}
              </button>
              {error && (
                <p className="text-xs text-red-400/80 animate-fade-in">{error}</p>
              )}
            </form>

            {/* Portal login link */}
            <div className="mt-16">
              <Link href="/auth/login" className="text-xs text-white/15 transition-colors hover:text-white/30 no-underline hover:no-underline">
                Portal Login
              </Link>
            </div>
          </div>
        )}

        {/* Popping state — just bubbles animating out */}
        {popping && (
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400/30 border-t-blue-400" />
          </div>
        )}

        {/* Main content (after password) */}
        {authenticated && (
          <div className="flex flex-col items-center animate-fade-in">
            {/* Rotating headline */}
            <div className="mb-4 text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                We make
              </h1>
              <div className="mt-2 h-[1.2em] overflow-hidden">
                <span
                  className={`block text-4xl font-bold tracking-tight text-blue-400 transition-all duration-400 sm:text-5xl md:text-6xl ${
                    wordVisible
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  }`}
                >
                  {ROTATING_WORDS[wordIndex]}
                </span>
              </div>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Effortless
              </h1>
            </div>

            <p className="mb-12 max-w-md text-center text-sm text-blue-200/40 leading-relaxed">
              Premium dental laboratory services delivered with precision and care
            </p>

            {/* Three form buttons */}
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <Link
                href="/dsd"
                className="group flex w-64 items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-8 py-4 text-sm font-medium text-blue-300 backdrop-blur-sm transition-all hover:bg-blue-500/20 hover:border-blue-400/30 hover:scale-[1.02] active:scale-[0.98] no-underline hover:no-underline"
              >
                <svg className="h-5 w-5 text-blue-400/60 transition-colors group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                </svg>
                Submit Design Case
              </Link>
              <Link
                href="/ceramics"
                className="group flex w-64 items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-8 py-4 text-sm font-medium text-blue-300 backdrop-blur-sm transition-all hover:bg-blue-500/20 hover:border-blue-400/30 hover:scale-[1.02] active:scale-[0.98] no-underline hover:no-underline"
              >
                <svg className="h-5 w-5 text-blue-400/60 transition-colors group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
                Submit Ceramic Case
              </Link>
              <Link
                href="/appliances"
                className="group flex w-64 items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-8 py-4 text-sm font-medium text-blue-300 backdrop-blur-sm transition-all hover:bg-blue-500/20 hover:border-blue-400/30 hover:scale-[1.02] active:scale-[0.98] no-underline hover:no-underline"
              >
                <svg className="h-5 w-5 text-blue-400/60 transition-colors group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
                </svg>
                Submit Appliance Case
              </Link>
            </div>

            {/* Portal login link */}
            <div className="mt-20">
              <Link href="/auth/login" className="text-xs text-white/15 transition-colors hover:text-white/30 no-underline hover:no-underline">
                Portal Login
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Keyframes for bubble animation */}
      <style jsx>{`
        @keyframes floatBubble {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(30px, -40px) scale(1.05);
          }
          50% {
            transform: translate(-20px, -70px) scale(0.95);
          }
          75% {
            transform: translate(40px, -30px) scale(1.02);
          }
        }
      `}</style>
    </div>
  )
}
