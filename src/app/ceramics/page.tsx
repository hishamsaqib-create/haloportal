'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Dentist {
  id: string
  name: string
  email: string | null
}

const WORK_OPTIONS = ['Emax', 'Feldspathic', 'Zirconia', 'Implant']

export default function CeramicsFormPage() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState('')
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
  const [patientDobDay, setPatientDobDay] = useState('')
  const [patientDobMonth, setPatientDobMonth] = useState('')
  const [patientDobYear, setPatientDobYear] = useState('')
  const [dentistId, setDentistId] = useState('')
  const [dentistEmail, setDentistEmail] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [workRequired, setWorkRequired] = useState<string[]>([])
  const [teethNeeded, setTeethNeeded] = useState('')
  const [shade, setShade] = useState('')
  const [translucency, setTranslucency] = useState('')
  const [anatomy, setAnatomy] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('halo-clinic')
    if (!raw) {
      router.replace('/')
      return
    }
    try {
      const clinic = JSON.parse(raw) as { id: string; name: string; dentists: Dentist[] }
      setClinicName(clinic.name)
      setDentists(clinic.dentists || [])
    } catch {
      router.replace('/')
      return
    }
    setLoading(false)
  }, [router])

  // Auto-fill dentist email when selected
  useEffect(() => {
    if (dentistId) {
      const d = dentists.find((d) => d.id === dentistId)
      if (d?.email) setDentistEmail(d.email)
    }
  }, [dentistId, dentists])

  function toggleWork(item: string) {
    setWorkRequired((prev) =>
      prev.includes(item) ? prev.filter((w) => w !== item) : [...prev, item]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!dentistId) { setError('Please select a dentist'); return }
    if (!patientFirstName.trim()) { setError('Please enter patient name'); return }
    if (!workRequired.length) { setError('Please select at least one type of work required'); return }

    setSubmitting(true)
    try {
      const patientName = [patientTitle, patientFirstName, patientLastName].filter(Boolean).join(' ')
      const patientDob = patientDobDay && patientDobMonth && patientDobYear
        ? `${patientDobDay}/${patientDobMonth}/${patientDobYear}`
        : undefined

      const res = await fetch('/api/public/submit-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: 'CERAMICS',
          dentistId,
          patientName,
          patientDob,
          dueDate: dueDate || undefined,
          workRequired,
          teethNeeded: teethNeeded || undefined,
          shade: shade || undefined,
          translucency: translucency || undefined,
          anatomy: anatomy || undefined,
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
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Case Submitted</h1>
          <p className="text-gray-500 text-sm mb-1">Your ceramic case has been received.</p>
          <p className="text-blue-600 font-mono text-lg mb-8">{caseNumber}</p>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 no-underline hover:no-underline">
            ← Back to Home
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
          <h1 className="text-2xl font-bold text-gray-900">Ceramic Case</h1>
          <p className="mt-1 text-sm text-gray-400">Submit a new ceramic restoration case</p>
          {clinicName && (
            <p className="mt-2 text-sm font-medium text-gray-600">{clinicName}</p>
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
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Date of Birth</label>
              <div className="grid grid-cols-3 gap-3">
                <input type="text" value={patientDobDay} onChange={(e) => setPatientDobDay(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="DD" maxLength={2} />
                <input type="text" value={patientDobMonth} onChange={(e) => setPatientDobMonth(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="MM" maxLength={2} />
                <input type="text" value={patientDobYear} onChange={(e) => setPatientDobYear(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="YYYY" maxLength={4} />
              </div>
            </div>
          </fieldset>

          {/* Dentist */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Dentist</legend>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Dentist *</label>
              {loading ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">Loading dentists...</div>
              ) : (
                <select value={dentistId} onChange={(e) => setDentistId(e.target.value)} required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400 appearance-none">
                  <option value="">Select a dentist</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Dentist Email</label>
              <input type="email" value={dentistEmail} onChange={(e) => setDentistEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                placeholder="dentist@clinic.com" />
            </div>
          </fieldset>

          {/* Dates */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Dates</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Today&apos;s Date</label>
                <input type="text" readOnly value={new Date().toLocaleDateString('en-GB')}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-400" />
              </div>
            </div>
          </fieldset>

          {/* Work Required */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Work Required *</legend>
            <div className="flex flex-wrap gap-3">
              {WORK_OPTIONS.map((item) => {
                const selected = workRequired.includes(item)
                return (
                  <button key={item} type="button" onClick={() => toggleWork(item)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all border ${
                      selected
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {item}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Case Details */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Case Details</legend>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Teeth Needed</label>
              <input type="text" value={teethNeeded} onChange={(e) => setTeethNeeded(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                placeholder="e.g. 11, 12, 21, 22" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Shade</label>
                <input type="text" value={shade} onChange={(e) => setShade(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="e.g. A2" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Translucency</label>
                <input type="text" value={translucency} onChange={(e) => setTranslucency(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="e.g. HT, MT, LT" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Anatomy</label>
                <input type="text" value={anatomy} onChange={(e) => setAnatomy(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400"
                  placeholder="e.g. Monolithic" />
              </div>
            </div>
          </fieldset>

          {/* File Upload placeholder */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">File Upload</legend>
            <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
                <p className="mt-2 text-xs text-gray-400">Upload coming soon — email files to ceramics@halolab.co.uk</p>
              </div>
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Notes</legend>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 resize-none"
              placeholder="Any additional notes or special instructions..." />
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
            {submitting ? 'Submitting...' : 'Submit Ceramic Case'}
          </button>
        </form>
      </div>
    </div>
  )
}
