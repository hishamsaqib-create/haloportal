'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Dentist {
  id: string
  name: string
  email: string | null
  clinic: { id: string; name: string }
}

const APPLIANCE_OPTIONS = [
  'Hawley Retainer',
  'Essix Retainer',
  'Fixed Retainer',
  'Night Guard',
  'Bleaching Tray',
  'Sports Guard',
  'Anti-Snoring Device',
  'Orthodontic Appliance',
  'Other',
]

export default function AppliancesFormPage() {
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
  const [appliance, setAppliance] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [dueDate, setDueDate] = useState('')
  const [iteroScanTaken, setIteroScanTaken] = useState('')
  const [iteroScanId, setIteroScanId] = useState('')
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
    if (!appliance) { setError('Please select an appliance'); return }

    setSubmitting(true)
    try {
      const patientName = [patientTitle, patientFirstName, patientLastName].filter(Boolean).join(' ')

      const res = await fetch('/api/public/submit-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: 'APPLIANCES',
          dentistId,
          patientName,
          dueDate: dueDate || undefined,
          appliance,
          quantity: quantity || '1',
          iteroScanTaken: iteroScanTaken || undefined,
          iteroScanId: iteroScanId || undefined,
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
          <p className="text-blue-200/50 text-sm mb-1">Your appliance case has been received.</p>
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
          <h1 className="text-2xl font-bold text-white">Appliance Case</h1>
          <p className="mt-1 text-sm text-blue-200/30">Submit a new dental appliance case</p>
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

          {/* Appliance */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">Appliance Details</legend>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Appliance *</label>
              <select value={appliance} onChange={(e) => setAppliance(e.target.value)} required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40 appearance-none">
                <option value="">Select an appliance</option>
                {APPLIANCE_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" max="20"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40" />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400/40" />
              </div>
            </div>
          </fieldset>

          {/* iTero */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-blue-300/40 mb-3">iTero Scan</legend>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">iTero Scan Taken?</label>
              <div className="flex gap-3">
                {['Yes', 'No'].map((opt) => (
                  <button key={opt} type="button" onClick={() => setIteroScanTaken(opt)}
                    className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all border ${
                      iteroScanTaken === opt
                        ? 'bg-blue-500/20 border-blue-400/30 text-blue-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/8 hover:text-white/60'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {iteroScanTaken === 'Yes' && (
              <div className="animate-fade-in">
                <label className="block text-xs text-white/40 mb-1.5">iTero Scan ID</label>
                <input type="text" value={iteroScanId} onChange={(e) => setIteroScanId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-blue-400/40"
                  placeholder="Enter scan ID" />
              </div>
            )}
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
            {submitting ? 'Submitting...' : 'Submit Appliance Case'}
          </button>
        </form>
      </div>
    </div>
  )
}
