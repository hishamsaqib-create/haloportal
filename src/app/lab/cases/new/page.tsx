'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DEPARTMENTS, PRIORITIES, DEPARTMENT_LABELS, PRIORITY_LABELS } from '@/lib/constants'

interface Clinic {
  id: string
  name: string
}

interface Dentist {
  id: string
  name: string
  clinicId: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  department: string
  basePrice: number
  requiresToothSelection: boolean
}

interface CaseItem {
  productId: string
  description: string
  qty: number
  toothNumbers: string[]
  material: string
  shade: string
  notes: string
  unitPrice: number
}

// UK dental notation: quadrant (UR/UL/LR/LL) + tooth number (1-8)
const UK_QUADRANTS = [
  { label: 'UR', teeth: ['UR8', 'UR7', 'UR6', 'UR5', 'UR4', 'UR3', 'UR2', 'UR1'] },
  { label: 'UL', teeth: ['UL1', 'UL2', 'UL3', 'UL4', 'UL5', 'UL6', 'UL7', 'UL8'] },
  { label: 'LR', teeth: ['LR8', 'LR7', 'LR6', 'LR5', 'LR4', 'LR3', 'LR2', 'LR1'] },
  { label: 'LL', teeth: ['LL1', 'LL2', 'LL3', 'LL4', 'LL5', 'LL6', 'LL7', 'LL8'] },
]
const ALL_TEETH = UK_QUADRANTS.flatMap(q => q.teeth)

function generatePatientRef(): string {
  const now = new Date()
  const year = now.getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `PAT-${year}-${rand}`
}

function emptyItem(): CaseItem {
  return {
    productId: '',
    description: '',
    qty: 1,
    toothNumbers: [],
    material: '',
    shade: '',
    notes: '',
    unitPrice: 0,
  }
}

export default function NewCasePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lookups
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [loadingDentists, setLoadingDentists] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Form state
  const [clinicId, setClinicId] = useState('')
  const [dentistId, setDentistId] = useState('')
  const [department, setDepartment] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [dueDate, setDueDate] = useState('')
  const [patientRef, setPatientRef] = useState('')
  const [patientFirstName, setPatientFirstName] = useState('')
  const [patientLastName, setPatientLastName] = useState('')
  const [patientInitials, setPatientInitials] = useState('')
  const [autoRef, setAutoRef] = useState(true)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<CaseItem[]>([emptyItem()])

  // Load clinics
  useEffect(() => {
    async function loadClinics() {
      try {
        const res = await fetch('/api/clinics')
        if (res.ok) {
          const data = await res.json()
          setClinics(data.data || [])
        }
      } catch {
        // ignore
      } finally {
        setLoadingClinics(false)
      }
    }
    loadClinics()
  }, [])

  // Load dentists when clinic changes
  useEffect(() => {
    if (!clinicId) {
      setDentists([])
      setDentistId('')
      return
    }
    async function loadDentists() {
      setLoadingDentists(true)
      try {
        const res = await fetch(`/api/clinics/${clinicId}/dentists`)
        if (res.ok) {
          const data = await res.json()
          setDentists(data.data || [])
        }
      } catch {
        // ignore
      } finally {
        setLoadingDentists(false)
      }
    }
    setDentistId('')
    loadDentists()
  }, [clinicId])

  // Load products when department changes
  useEffect(() => {
    if (!department) {
      setProducts([])
      return
    }
    async function loadProducts() {
      setLoadingProducts(true)
      try {
        const res = await fetch(`/api/products?department=${department}&active=true`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.data || [])
        }
      } catch {
        // ignore
      } finally {
        setLoadingProducts(false)
      }
    }
    loadProducts()
  }, [department])

  // Auto-generate patient ref
  useEffect(() => {
    if (autoRef) {
      setPatientRef(generatePatientRef())
    }
  }, [autoRef])

  const updateItem = useCallback((index: number, field: keyof CaseItem, value: unknown) => {
    setItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setItems((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          productId: product.id,
          description: product.name,
          unitPrice: product.basePrice,
        }
        return updated
      })
    } else {
      updateItem(index, 'productId', '')
    }
  }

  function toggleTooth(index: number, tooth: string) {
    setItems((prev) => {
      const updated = [...prev]
      const current = updated[index].toothNumbers
      if (current.includes(tooth)) {
        updated[index] = {
          ...updated[index],
          toothNumbers: current.filter((t) => t !== tooth),
        }
      } else {
        updated[index] = {
          ...updated[index],
          toothNumbers: [...current, tooth].sort(
            (a, b) => ALL_TEETH.indexOf(a) - ALL_TEETH.indexOf(b)
          ),
        }
      }
      return updated
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const payload = {
      clinicId,
      dentistId,
      department,
      priority,
      dueDate: dueDate || undefined,
      patientRef: patientRef || undefined,
      patientFirstName: patientFirstName || undefined,
      patientLastName: patientLastName || undefined,
      patientInitials: patientInitials || undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        productId: item.productId || undefined,
        description: item.description,
        qty: item.qty,
        toothNumbers: item.toothNumbers.length > 0 ? item.toothNumbers : undefined,
        material: item.material || undefined,
        shade: item.shade || undefined,
        notes: item.notes || undefined,
        unitPrice: item.unitPrice,
      })),
    }

    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/lab/cases/${data.data.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create case')
      }
    } catch {
      setError('Failed to create case. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/lab/cases" className="hover:text-brand-700">
          Cases
        </Link>
        <span>/</span>
        <span className="text-gray-900">New Case</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Case</h1>
        <p className="text-sm text-gray-500">Enter case details and add items</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Case Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Case Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass}>
                Clinic <span className="text-red-500">*</span>
              </label>
              <select
                value={clinicId}
                onChange={(e) => setClinicId(e.target.value)}
                className={inputClass}
                required
                disabled={loadingClinics}
              >
                <option value="">
                  {loadingClinics ? 'Loading clinics...' : 'Select clinic'}
                </option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Dentist <span className="text-red-500">*</span>
              </label>
              <select
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
                className={inputClass}
                required
                disabled={!clinicId || loadingDentists}
              >
                <option value="">
                  {!clinicId
                    ? 'Select clinic first'
                    : loadingDentists
                    ? 'Loading dentists...'
                    : 'Select dentist'}
                </option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Patient */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Patient Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>First Name</label>
              <input
                type="text"
                value={patientFirstName}
                onChange={(e) => setPatientFirstName(e.target.value)}
                placeholder="e.g. John"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Last Name</label>
              <input
                type="text"
                value={patientLastName}
                onChange={(e) => setPatientLastName(e.target.value)}
                placeholder="e.g. Doe"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Patient Initials</label>
              <input
                type="text"
                value={patientInitials}
                onChange={(e) => setPatientInitials(e.target.value.toUpperCase())}
                placeholder="e.g. JD"
                maxLength={5}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Patient Reference</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={patientRef}
                  onChange={(e) => setPatientRef(e.target.value)}
                  placeholder="PAT-YYYY-XXXX"
                  className={inputClass}
                  disabled={autoRef}
                />
                <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoRef}
                    onChange={(e) => setAutoRef(e.target.checked)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  Auto
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-gray-500">
              Items <span className="text-red-500">*</span>
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-6">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="relative rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="absolute right-3 top-3 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                    title="Remove item"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                <div className="mb-3 text-xs font-semibold uppercase text-gray-400">
                  Item {idx + 1}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className={inputClass}
                      disabled={!department || loadingProducts}
                    >
                      <option value="">
                        {!department
                          ? 'Select department first'
                          : loadingProducts
                          ? 'Loading...'
                          : 'Select product (optional)'}
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.sku ? `(${p.sku})` : ''} - £{p.basePrice.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Item description"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Qty</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) =>
                        updateItem(idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))
                      }
                      min={1}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Material</label>
                    <input
                      type="text"
                      value={item.material}
                      onChange={(e) => updateItem(idx, 'material', e.target.value)}
                      placeholder="e.g. Zirconia"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Shade</label>
                    <input
                      type="text"
                      value={item.shade}
                      onChange={(e) => updateItem(idx, 'shade', e.target.value)}
                      placeholder="e.g. A2"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Unit Price (£)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      min={0}
                      step={0.01}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Tooth Selection - UK Notation */}
                <div className="mt-3">
                  <label className={labelClass}>Tooth Numbers (UK Notation)</label>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    {/* Upper teeth */}
                    <div className="flex gap-0.5 justify-center mb-0.5">
                      {UK_QUADRANTS[0].teeth.map((tooth) => (
                        <button key={tooth} type="button" onClick={() => toggleTooth(idx, tooth)}
                          className={`h-8 w-10 rounded-t text-[10px] font-semibold transition-colors ${
                            item.toothNumbers.includes(tooth)
                              ? 'bg-brand-700 text-white'
                              : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}>
                          {tooth}
                        </button>
                      ))}
                      <div className="w-px bg-gray-300 mx-0.5" />
                      {UK_QUADRANTS[1].teeth.map((tooth) => (
                        <button key={tooth} type="button" onClick={() => toggleTooth(idx, tooth)}
                          className={`h-8 w-10 rounded-t text-[10px] font-semibold transition-colors ${
                            item.toothNumbers.includes(tooth)
                              ? 'bg-brand-700 text-white'
                              : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}>
                          {tooth}
                        </button>
                      ))}
                    </div>
                    {/* Divider */}
                    <div className="border-t-2 border-gray-300 my-0.5" />
                    {/* Lower teeth */}
                    <div className="flex gap-0.5 justify-center mt-0.5">
                      {UK_QUADRANTS[2].teeth.map((tooth) => (
                        <button key={tooth} type="button" onClick={() => toggleTooth(idx, tooth)}
                          className={`h-8 w-10 rounded-b text-[10px] font-semibold transition-colors ${
                            item.toothNumbers.includes(tooth)
                              ? 'bg-brand-700 text-white'
                              : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}>
                          {tooth}
                        </button>
                      ))}
                      <div className="w-px bg-gray-300 mx-0.5" />
                      {UK_QUADRANTS[3].teeth.map((tooth) => (
                        <button key={tooth} type="button" onClick={() => toggleTooth(idx, tooth)}
                          className={`h-8 w-10 rounded-b text-[10px] font-semibold transition-colors ${
                            item.toothNumbers.includes(tooth)
                              ? 'bg-brand-700 text-white'
                              : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}>
                          {tooth}
                        </button>
                      ))}
                    </div>
                    {/* Labels */}
                    <div className="flex justify-between mt-2 px-2">
                      <span className="text-[10px] text-gray-400 font-medium">Right</span>
                      <span className="text-[10px] text-gray-400 font-medium">Left</span>
                    </div>
                  </div>
                  {item.toothNumbers.length > 0 && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Selected: {item.toothNumbers.join(', ')}
                    </p>
                  )}
                </div>

                {/* Item Notes */}
                <div className="mt-3">
                  <label className={labelClass}>Item Notes</label>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateItem(idx, 'notes', e.target.value)}
                    placeholder="Optional notes for this item"
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6">
          <Link
            href="/lab/cases"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-700 px-6 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Creating Case...' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  )
}
