'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DentalChart } from '@/components/dental-chart'

interface DentistSession {
  id: string
  name: string
  clinicId: string
  clinicName: string
  allowCeramics: boolean
  allowDsd: boolean
  allowAppliances: boolean
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
  const router = useRouter()
  const [dentistSession, setDentistSession] = useState<DentistSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [caseNumber, setCaseNumber] = useState('')
  const [error, setError] = useState('')

  // Form state
  const [patientTitle, setPatientTitle] = useState('')
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')
  const [appliance, setAppliance] = useState('')
  const [arch, setArch] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [dueDate, setDueDate] = useState('')
  const [teethNeeded, setTeethNeeded] = useState('')
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [iteroScanTaken, setIteroScanTaken] = useState('')
  const [iteroScanId, setIteroScanId] = useState('')
  const [notes, setNotes] = useState('')
  const [isRemake, setIsRemake] = useState(false)
  const [remakeReason, setRemakeReason] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('halo-dentist')
    if (!raw) {
      router.replace('/')
      return
    }
    try {
      const session: DentistSession = JSON.parse(raw)
      if (!session.allowAppliances) {
        router.replace('/')
        return
      }
      setDentistSession(session)
    } catch {
      router.replace('/')
      return
    }
    setLoading(false)
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !dentistSession) return
    setError('')

    if (!patientFirstName.trim()) { setError('Please enter patient name'); return }
    if (!appliance) { setError('Please select an appliance'); return }
    if (!arch) { setError('Please select an arch (Upper, Lower, or Both)'); return }

    setSubmitting(true)
    try {
      const patientName = [patientTitle, patientFirstName, patientLastName].filter(Boolean).join(' ')

      const res = await fetch('/api/public/submit-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: 'APPLIANCES',
          dentistId: dentistSession.id,
          patientName,
          dueDate: dueDate || undefined,
          appliance,
          arch: arch || undefined,
          quantity: quantity || '1',
          teethNeeded: teethNeeded || undefined,
          iteroScanTaken: iteroScanTaken || undefined,
          iteroScanId: iteroScanId || undefined,
          notes: notes || undefined,
          isRemake,
          remakeReason: isRemake ? remakeReason : undefined,
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

  if (loading) return null

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Case Submitted</h1>
          <p className="text-gray-500 text-sm mb-1">Your appliance case has been received.</p>
          <p className="text-blue-600 font-mono text-lg mb-8">{caseNumber}</p>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 no-underline hover:no-underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 no-underline hover:no-underline mb-6">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Appliance Case</h1>
          <p className="mt-1 text-sm text-gray-400">Submit a new dental appliance case</p>
          {dentistSession && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-600">{dentistSession.name}</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">{dentistSession.clinicName}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Patient Details */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Patient Details</legend>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-1">
                <label className="block text-xs text-gray-500 mb-1.5">Title</label>
                <select value={patientTitle} onChange={(e) => setPatientTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 appearance-none">
                  <option value="">-</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                  <option value="Miss">Miss</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-gray-500 mb-1.5">First Name *</label>
                <input type="text" value={patientFirstName} onChange={(e) => setPatientFirstName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="First name" required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Last Name</label>
                <input type="text" value={patientLastName} onChange={(e) => setPatientLastName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="Last name" />
              </div>
            </div>
          </fieldset>

          {/* Appliance */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Appliance Details</legend>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Appliance *</label>
              <select value={appliance} onChange={(e) => setAppliance(e.target.value)} required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 appearance-none">
                <option value="">Select an appliance</option>
                {APPLIANCE_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Arch *</label>
              <div className="flex gap-3">
                {['Upper', 'Lower', 'Both'].map((opt) => (
                  <button key={opt} type="button" onClick={() => setArch(opt)}
                    className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all border ${
                      arch === opt
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" max="20"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400" />
              </div>
            </div>
          </fieldset>

          {/* Teeth Selection */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Teeth Selection</legend>
            <DentalChart
              selectedTeeth={selectedTeeth}
              onChange={(teeth) => {
                setSelectedTeeth(teeth)
                setTeethNeeded(teeth.join(', '))
              }}
            />
          </fieldset>

          {/* iTero */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">iTero Scan</legend>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">iTero Scan Taken?</label>
              <div className="flex gap-3">
                {['Yes', 'No'].map((opt) => (
                  <button key={opt} type="button" onClick={() => setIteroScanTaken(opt)}
                    className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all border ${
                      iteroScanTaken === opt
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {iteroScanTaken === 'Yes' && (
              <div className="animate-fade-in">
                <label className="block text-xs text-gray-500 mb-1.5">iTero Scan ID</label>
                <input type="text" value={iteroScanId} onChange={(e) => setIteroScanId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="Enter scan ID" />
              </div>
            )}
          </fieldset>

          {/* Notes */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Notes</legend>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 resize-none"
              placeholder="Any additional notes or special instructions..." />
          </fieldset>

          {/* Remake */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Remake Information</legend>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isRemake} onChange={(e) => setIsRemake(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700">This is a remake of a previous case</span>
            </label>
            {isRemake && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Reason for Remake</label>
                <select value={remakeReason} onChange={(e) => setRemakeReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400">
                  <option value="">Select a reason...</option>
                  <option value="FIT_ISSUE">Fit Issue</option>
                  <option value="SHADE_MISMATCH">Shade Mismatch</option>
                  <option value="BREAKAGE">Breakage</option>
                  <option value="DESIGN_ERROR">Design Error</option>
                  <option value="MATERIAL_DEFECT">Material Defect</option>
                  <option value="IMPRESSION_ISSUE">Impression Issue</option>
                  <option value="WRONG_SHADE">Wrong Shade</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}
          </fieldset>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
