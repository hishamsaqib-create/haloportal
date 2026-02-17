'use client'

import { useState, useEffect } from 'react'

interface ReferralCentre {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  defaultLeadTimeDays: number
  specialties: string | null
  billingTerms: string | null
  notes: string | null
  active: boolean
  _count?: {
    outsourceOrders: number
  }
}

export default function ReferralCentresPage() {
  const [centres, setCentres] = useState<ReferralCentre[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCentre, setEditingCentre] = useState<ReferralCentre | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formLeadTime, setFormLeadTime] = useState(5)
  const [formSpecialties, setFormSpecialties] = useState('')
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => {
    fetchCentres()
  }, [])

  async function fetchCentres() {
    setLoading(true)
    try {
      const res = await fetch('/api/referral-centres')
      if (res.ok) {
        const data = await res.json()
        setCentres(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingCentre(null)
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormAddress('')
    setFormLeadTime(5)
    setFormSpecialties('')
    setFormNotes('')
    setError(null)
    setShowModal(true)
  }

  function openEditModal(centre: ReferralCentre) {
    setEditingCentre(centre)
    setFormName(centre.name)
    setFormEmail(centre.email || '')
    setFormPhone(centre.phone || '')
    setFormAddress(centre.address || '')
    setFormLeadTime(centre.defaultLeadTimeDays)
    const specs = centre.specialties ? JSON.parse(centre.specialties) : []
    setFormSpecialties(Array.isArray(specs) ? specs.join(', ') : '')
    setFormNotes(centre.notes || '')
    setError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const specialtiesArray = formSpecialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const payload = {
      name: formName,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      address: formAddress || undefined,
      defaultLeadTimeDays: formLeadTime,
      specialties: specialtiesArray.length > 0 ? JSON.stringify(specialtiesArray) : undefined,
      notes: formNotes || undefined,
    }

    try {
      const url = editingCentre
        ? `/api/referral-centres/${editingCentre.id}`
        : '/api/referral-centres'
      const method = editingCentre ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowModal(false)
        fetchCentres()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save referral centre')
      }
    } catch {
      setError('Failed to save referral centre')
    } finally {
      setSaving(false)
    }
  }

  function parseSpecialties(json: string | null): string[] {
    if (!json) return []
    try {
      const parsed = JSON.parse(json)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Centres</h1>
          <p className="text-sm text-gray-500">Manage outsourcing partners and referral centres</p>
        </div>
        <button
          onClick={openAddModal}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Add Referral Centre
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Specialties</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Lead Time</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Orders</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading referral centres...
                  </td>
                </tr>
              ) : centres.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No referral centres found. Add your first referral centre.
                  </td>
                </tr>
              ) : (
                centres.map((centre) => {
                  const specs = parseSpecialties(centre.specialties)
                  return (
                    <tr key={centre.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-gray-900">{centre.name}</div>
                        {centre.phone && (
                          <div className="text-xs text-gray-500">{centre.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{centre.email || '---'}</td>
                      <td className="px-6 py-3">
                        {specs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {specs.map((s) => (
                              <span
                                key={s}
                                className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">---</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center text-sm text-gray-900">
                        {centre.defaultLeadTimeDays} days
                      </td>
                      <td className="px-6 py-3 text-center text-sm text-gray-900">
                        {centre._count?.outsourceOrders || 0}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            centre.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {centre.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openEditModal(centre)}
                          className="text-sm font-medium text-brand-700 hover:text-brand-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCentre ? 'Edit Referral Centre' : 'Add Referral Centre'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className={inputClass}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Lead Time (days)
                  </label>
                  <input
                    type="number"
                    value={formLeadTime}
                    onChange={(e) => setFormLeadTime(parseInt(e.target.value) || 5)}
                    min={1}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialties</label>
                  <input
                    type="text"
                    value={formSpecialties}
                    onChange={(e) => setFormSpecialties(e.target.value)}
                    placeholder="Comma-separated (e.g. Ceramics, Implants)"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className={inputClass}
                    rows={2}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingCentre ? 'Update Centre' : 'Add Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
