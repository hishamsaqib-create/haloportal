'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DELIVERY_METHODS, DELIVERY_METHOD_LABELS, DEPARTMENT_LABELS, CASE_STATUS_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

interface ClinicOption {
  id: string
  name: string
  address: string | null
}

interface CaseOption {
  id: string
  caseNumber: string
  department: string
  status: string
  priority: string
  dueDate: string | null
  patient: { reference: string; firstName: string | null; lastName: string | null; initials: string | null } | null
  dentist: { name: string }
  items: { description: string; lineTotal: number }[]
}

export default function NewDeliveryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clinics, setClinics] = useState<ClinicOption[]>([])
  const [cases, setCases] = useState<CaseOption[]>([])
  const [loadingCases, setLoadingCases] = useState(false)

  const [clinicId, setClinicId] = useState('')
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set())
  const [method, setMethod] = useState('COURIER')
  const [trackingRef, setTrackingRef] = useState('')
  const [driverName, setDriverName] = useState('')
  const [estimatedDate, setEstimatedDate] = useState('')
  const [notes, setNotes] = useState('')

  // Load clinics on mount
  useEffect(() => {
    fetch('/api/clinics')
      .then((res) => res.json())
      .then((data) => setClinics(data.data || []))
  }, [])

  // Load cases when clinic is selected
  useEffect(() => {
    if (!clinicId) {
      setCases([])
      setSelectedCaseIds(new Set())
      return
    }
    setLoadingCases(true)
    // Fetch cases for the selected clinic that are ready for dispatch
    fetch(`/api/cases?clinicId=${clinicId}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        // Filter to cases that are eligible for dispatch (READY or QC passed)
        const eligible = (data.data || []).filter(
          (c: CaseOption) => ['READY', 'QC', 'DISPATCHED'].includes(c.status)
        )
        setCases(eligible)
        setSelectedCaseIds(new Set())
      })
      .finally(() => setLoadingCases(false))
  }, [clinicId])

  function toggleCase(caseId: string) {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(caseId)) {
        next.delete(caseId)
      } else {
        next.add(caseId)
      }
      return next
    })
  }

  function selectAll() {
    if (selectedCaseIds.size === cases.length) {
      setSelectedCaseIds(new Set())
    } else {
      setSelectedCaseIds(new Set(cases.map((c) => c.id)))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedCaseIds.size === 0) {
      alert('Please select at least one case to dispatch')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          caseIds: Array.from(selectedCaseIds),
          method,
          trackingRef: trackingRef || undefined,
          driverName: driverName || undefined,
          estimatedDate: estimatedDate || undefined,
          notes: notes || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/lab/deliveries/${data.data.id}`)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create delivery')
      }
    } catch {
      alert('Failed to create delivery')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/lab/deliveries" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          &larr; Deliveries
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">New Delivery</h1>
        <p className="text-sm text-gray-500">Select a clinic and choose cases to dispatch</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main - Case Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clinic Selection */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Select Clinic</h2>
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Choose a clinic...</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.address ? ` \u2014 ${c.address}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Case Selection */}
            {clinicId && (
              <div className="rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Select Cases
                    </h2>
                    <p className="text-xs text-gray-400">
                      {cases.length} case{cases.length !== 1 ? 's' : ''} ready for dispatch
                      {selectedCaseIds.size > 0 && (
                        <> &middot; <span className="font-semibold text-brand-700">{selectedCaseIds.size} selected</span></>
                      )}
                    </p>
                  </div>
                  {cases.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-sm font-medium text-brand-700 hover:text-brand-800 transition-colors"
                    >
                      {selectedCaseIds.size === cases.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {loadingCases ? (
                  <div className="px-6 py-12 text-center text-sm text-gray-500">Loading cases...</div>
                ) : cases.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No cases ready for dispatch at this clinic.</p>
                    <p className="mt-1 text-xs text-gray-400">Cases must be in Ready or QC status.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {cases.map((c) => {
                      const isSelected = selectedCaseIds.has(c.id)
                      const totalValue = c.items.reduce((sum, i) => sum + i.lineTotal, 0)
                      return (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-4 px-6 py-3 transition-colors ${
                            isSelected ? 'bg-brand-50/50' : 'hover:bg-gray-50/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCase(c.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{c.caseNumber}</span>
                              <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${
                                c.department === 'CERAMICS' ? 'bg-blue-50 text-blue-700' :
                                c.department === 'APPLIANCES' ? 'bg-purple-50 text-purple-700' :
                                'bg-teal-50 text-teal-700'
                              }`}>
                                {DEPARTMENT_LABELS[c.department as keyof typeof DEPARTMENT_LABELS]}
                              </span>
                              <span className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                {CASE_STATUS_LABELS[c.status as keyof typeof CASE_STATUS_LABELS]}
                              </span>
                              {c.priority === 'URGENT' && (
                                <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                  Urgent
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                              <span>{c.patient ? [c.patient.firstName, c.patient.lastName].filter(Boolean).join(' ') || c.patient.initials || c.patient.reference : 'No patient'}</span>
                              <span>&middot;</span>
                              <span>{c.dentist.name}</span>
                              {c.dueDate && (
                                <>
                                  <span>&middot;</span>
                                  <span>Due: {formatDate(c.dueDate)}</span>
                                </>
                              )}
                              <span>&middot;</span>
                              <span>{c.items.length} item{c.items.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-700">
                              {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(totalValue)}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Delivery Details */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Delivery Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {DELIVERY_METHODS.map((m) => (
                      <option key={m} value={m}>{DELIVERY_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Tracking Reference</label>
                  <input
                    type="text"
                    value={trackingRef}
                    onChange={(e) => setTrackingRef(e.target.value)}
                    placeholder="e.g. RM1234567890GB"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Driver / Courier Name</label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Estimated Delivery Date</label>
                  <input
                    type="date"
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Special instructions, fragile items, etc."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Summary & Submit */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Clinic</span>
                  <span className="font-medium text-gray-900">
                    {clinics.find((c) => c.id === clinicId)?.name || '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cases</span>
                  <span className="font-medium text-gray-900">{selectedCaseIds.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="font-medium text-gray-900">
                    {DELIVERY_METHOD_LABELS[method as keyof typeof DELIVERY_METHOD_LABELS]}
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || selectedCaseIds.size === 0 || !clinicId}
                className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : `Dispatch ${selectedCaseIds.size} Case${selectedCaseIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
