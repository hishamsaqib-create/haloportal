'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ClinicData {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  billingName: string | null
  billingAddress: string | null
  billingEmail: string | null
  vatNumber: string | null
  paymentTermDays: number
  notes: string | null
  active: boolean
}

export function ClinicEditForm({ clinic }: { clinic: ClinicData }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: clinic.name,
    email: clinic.email || '',
    phone: clinic.phone || '',
    address: clinic.address || '',
    billingName: clinic.billingName || '',
    billingAddress: clinic.billingAddress || '',
    billingEmail: clinic.billingEmail || '',
    vatNumber: clinic.vatNumber || '',
    paymentTermDays: clinic.paymentTermDays,
    notes: clinic.notes || '',
  })

  function updateField(field: string, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clinics/${clinic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update clinic')
      }
    } catch {
      setError('Failed to update clinic')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Clinic Details</h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Edit
          </button>
        ) : (
          <button
            onClick={() => setEditing(false)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            disabled={!editing}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            disabled={!editing}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            disabled={!editing}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
          <textarea
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            disabled={!editing}
            className={inputClass}
            rows={2}
          />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Billing</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Billing Name</label>
          <input
            type="text"
            value={formData.billingName}
            onChange={(e) => updateField('billingName', e.target.value)}
            disabled={!editing}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Billing Address</label>
          <textarea
            value={formData.billingAddress}
            onChange={(e) => updateField('billingAddress', e.target.value)}
            disabled={!editing}
            className={inputClass}
            rows={2}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Billing Email</label>
          <input
            type="email"
            value={formData.billingEmail}
            onChange={(e) => updateField('billingEmail', e.target.value)}
            disabled={!editing}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">VAT Number</label>
            <input
              type="text"
              value={formData.vatNumber}
              onChange={(e) => updateField('vatNumber', e.target.value)}
              disabled={!editing}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms (days)</label>
            <input
              type="number"
              value={formData.paymentTermDays}
              onChange={(e) => updateField('paymentTermDays', parseInt(e.target.value) || 30)}
              disabled={!editing}
              min={0}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            disabled={!editing}
            className={inputClass}
            rows={2}
          />
        </div>

        {editing && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
