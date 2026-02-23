'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { DEPARTMENT_LABELS } from '@/lib/constants'

interface Prescription {
  id: string
  version: number
  pdfUrl: string | null
  structuredData: string
  generatedAt: string
  case: {
    id: string
    caseNumber: string
    department: string
    clinic: { name: string }
    dentist: { name: string }
    patient: { reference: string; firstName: string | null; lastName: string | null; initials: string | null } | null
  }
  generatedBy: {
    id: string
    name: string
  }
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [genCaseId, setGenCaseId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const caseId = params.get('caseId')
    if (caseId) {
      setGenCaseId(caseId)
      setShowGenerate(true)
    }
  }, [])

  useEffect(() => {
    fetchPrescriptions()
  }, [])

  async function fetchPrescriptions() {
    setLoading(true)
    try {
      const res = await fetch('/api/prescriptions')
      if (res.ok) {
        const data = await res.json()
        setPrescriptions(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function generatePrescription(e: React.FormEvent) {
    e.preventDefault()
    if (!genCaseId) return
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: genCaseId }),
      })
      if (res.ok) {
        setShowGenerate(false)
        setGenCaseId('')
        fetchPrescriptions()
      } else {
        const data = await res.json()
        setGenError(data.error || 'Failed to generate prescription')
      }
    } catch {
      setGenError('Failed to generate prescription')
    } finally {
      setGenerating(false)
    }
  }

  function openPrintView(rxId: string) {
    window.open(`/api/prescriptions/${rxId}/pdf`, '_blank')
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-sm text-gray-500">Generate and print prescriptions for cases</p>
        </div>
        <button
          onClick={() => {
            setShowGenerate(true)
            setGenError(null)
          }}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Generate Prescription
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Case #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic / Dentist</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Department</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Generated</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading prescriptions...
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No prescriptions generated yet.
                  </td>
                </tr>
              ) : (
                prescriptions.map((rx) => (
                  <tr key={rx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/lab/cases/${rx.case.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        {rx.case.caseNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {rx.case.patient ? [rx.case.patient.firstName, rx.case.patient.lastName].filter(Boolean).join(' ') || rx.case.patient.initials || rx.case.patient.reference : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-900">{rx.case.clinic.name}</div>
                      <div className="text-xs text-gray-500">{rx.case.dentist.name}</div>
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-gray-600">
                      {DEPARTMENT_LABELS[rx.case.department as keyof typeof DEPARTMENT_LABELS] || rx.case.department}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        v{rx.version}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-gray-600">{formatDateTime(rx.generatedAt)}</div>
                      <div className="text-xs text-gray-400">by {rx.generatedBy.name}</div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => openPrintView(rx.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 12h.008v.008h-.008V12Zm-3 0h.008v.008h-.008V12Z" />
                        </svg>
                        Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Generate Prescription</h2>
              <button
                onClick={() => setShowGenerate(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={generatePrescription} className="p-6">
              {genError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {genError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={genCaseId}
                  onChange={(e) => setGenCaseId(e.target.value)}
                  placeholder="Enter case ID"
                  className={inputClass}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the case ID to generate a prescription for.
                </p>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
