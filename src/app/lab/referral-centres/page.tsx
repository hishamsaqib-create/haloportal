'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

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
  const [search, setSearch] = useState('')

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
      toast.error('Failed to load referral centres')
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
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

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
        toast.success(editingCentre ? 'Centre updated' : 'Centre added')
        fetchCentres()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save referral centre')
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

  const filtered = centres.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-[13px] placeholder-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Referral Centres</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage outsourcing partners and referral centres</p>
        </div>
        <button
          onClick={openAddModal}
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 transition-all duration-200 shadow-sm"
        >
          Add Centre
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search centres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200/60 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Specialties</th>
                <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Lead Time</th>
                <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Orders</th>
                <th className="px-6 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[13px] text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <p className="text-[13px] text-gray-400">No referral centres found</p>
                    <button onClick={openAddModal} className="mt-2 text-[13px] font-semibold text-gray-900 hover:underline">
                      Add your first centre
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((centre) => {
                  const specs = parseSpecialties(centre.specialties)
                  return (
                    <tr key={centre.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-6 py-3.5">
                        <div className="text-[13px] font-semibold text-gray-900">{centre.name}</div>
                        {centre.phone && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{centre.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-[13px] text-gray-600">{centre.email || '---'}</td>
                      <td className="px-6 py-3.5">
                        {specs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {specs.map((s) => (
                              <span
                                key={s}
                                className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[13px] text-gray-300">---</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center text-[13px] font-medium text-gray-900">
                        {centre.defaultLeadTimeDays}d
                      </td>
                      <td className="px-6 py-3.5 text-center text-[13px] font-medium text-gray-900">
                        {centre._count?.outsourceOrders || 0}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            centre.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {centre.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => openEditModal(centre)}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-100 transition-all duration-150"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200/60">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-[16px] font-bold text-gray-900">
                {editingCentre ? 'Edit Referral Centre' : 'Add Referral Centre'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-150"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Address</label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className={inputClass}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
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
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Specialties</label>
                  <input
                    type="text"
                    value={formSpecialties}
                    onChange={(e) => setFormSpecialties(e.target.value)}
                    placeholder="Comma-separated (e.g. Ceramics, Implants)"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className={inputClass}
                    rows={2}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 shadow-sm"
                >
                  {saving ? 'Saving...' : editingCentre ? 'Update' : 'Add Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
