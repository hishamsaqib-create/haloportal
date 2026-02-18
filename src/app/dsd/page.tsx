'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Dentist {
  id: string
  name: string
  email: string | null
  clinic: { id: string; name: string }
}

export default function DSDFormPage() {
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [caseNumber, setCaseNumber] = useState('')
  const [error, setError] = useState('')

  // Form state
  const [patientTitle, setPatientTitle] = useState('')
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')
  const [dentistId, setDentistId] = useState('')
  const [dentistEmail, setDentistEmail] = useState('')
  const [teethOnDsd, setTeethOnDsd] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch('/api/public/dentists')
      .then((r) => r.json())
      .then((data) => setDentists(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (dentistId) {
      const d = dentists.find((d) => d.id === dentistId)
      if (d?.email) setDentistEmail(d.email)
    }
  }, [dentistId, dentists])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!dentistId) { setError('Please select a dentist'); return }
    if (!patientFirstName.trim()) { setError('Please enter patient name'); return }
    if (!teethOnDsd.trim()) { setError('Please enter teeth for DSD'); return }

    setSubmitting(true)
    try {
      const patientName = [patientTitle, patientFirstName, patientLastName].filter(Boolean).join(' ')

      const res = await fetch('/api/public/submit-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: 'DSD',
          dentistId,
          patientName,
          dueDate: dueDate || undefined,
          teethOnDsd: teethOnDsd || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setCaseNumber(data.data.caseNumber)
        setSubmitted(true)
      } else {
        setError(data.error || 'Failed to submit case')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#060613] flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Case Submitted</h1>
          <p className="text-blue-200/50 text-sm mb-1">Your DSD case has been received.</p>
          <p className="text-blue-300 font-mono text-lg mb-8">{caseNumber}</p>
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 no-underline hover:no-underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060613]">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-blue-400/60 hover:text-blue-400 no-underline hover:no-underline mb-6">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-white">Digital Smile Design</h1>
          <p className="mt-1 text-sm text-blue-200/30">Submit a new DSD case</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Patient Details */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">Patient Details</legend>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-1">
                <label className="block text-xs text-white/40 mb-1.5">Title</label>
                <select value={patientTitle} onChange={(e) => setPatientTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40 appearance-none">
                  <option value="">-</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                  <option value="Miss">Miss</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-white/40 mb-1.5">First Name *</label>
                <input type="text" value={patientFirstName} onChange={(e) => setPatientFirstName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400/40"
                  placeholder="First name" required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-white/40 mb-1.5">Last Name</label>
                <input type="text" value={patientLastName} onChange={(e) => setPatientLastName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400/40"
                  placeholder="Last name" />
              </div>
            </div>
          </fieldset>

          {/* Dentist */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">Dentist</legend>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Dentist *</label>
              {loading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/30">Loading dentists...</div>
              ) : (
                <select value={dentistId} onChange={(e) => setDentistId(e.target.value)} required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40 appearance-none">
                  <option value="">Select a dentist</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.clinic.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Dentist Email</label>
              <input type="email" value={dentistEmail} onChange={(e) => setDentistEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400/40"
                placeholder="dentist@clinic.com" />
            </div>
          </fieldset>

          {/* DSD Details */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">Design Details</legend>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Teeth on DSD *</label>
              <input type="text" value={teethOnDsd} onChange={(e) => setTeethOnDsd(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400/40"
                placeholder="e.g. 13-23 (Upper anteriors)" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Today&apos;s Date</label>
                <input type="text" readOnly value={new Date().toLocaleDateString('en-GB')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/50 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40" />
              </div>
            </div>
          </fieldset>

          {/* File Upload placeholder */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">File Upload</legend>
            <div className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-white/15" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <p className="mt-2 text-xs text-white/25">Upload coming soon — email files to design@halolab.co.uk</p>
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">Notes</legend>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400/40 resize-none"
              placeholder="Any additional notes or special instructions..." />
          </fieldset>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={submitting}
            className="w-full rounded-2xl bg-blue-500 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Submitting...' : 'Submit DSD Case'}
          </button>
        </form>
      </div>
    </div>
  )
}
