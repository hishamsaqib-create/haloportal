'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Clinic {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  active: boolean
  _count: {
    dentists: number
    cases: number
  }
}

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')

  useEffect(() => {
    fetchClinics()
  }, [search])

  async function fetchClinics() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    try {
      const res = await fetch(`/api/clinics?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClinics(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormAddress('')
    setError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail || undefined,
          phone: formPhone || undefined,
          address: formAddress || undefined,
        }),
      })
      if (res.ok) {
        setShowModal(false)
        fetchClinics()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create clinic')
      }
    } catch {
      setError('Failed to create clinic')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
          <p className="text-sm text-gray-500">Manage clinic accounts and details</p>
        </div>
        <button
          onClick={openAddModal}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Add Clinic
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search clinics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Dentists</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Cases</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading clinics...
                  </td>
                </tr>
              ) : clinics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    No clinics found.
                  </td>
                </tr>
              ) : (
                clinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link
                        href={`/lab/clinics/${clinic.id}`}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        {clinic.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{clinic.email || '---'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{clinic.phone || '---'}</td>
                    <td className="px-6 py-3 text-center text-sm text-gray-900">
                      {clinic._count.dentists}
                    </td>
                    <td className="px-6 py-3 text-center text-sm text-gray-900">
                      {clinic._count.cases}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          clinic.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {clinic.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/lab/clinics/${clinic.id}`}
                        className="text-sm font-medium text-brand-700 hover:text-brand-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Clinic Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Clinic</h2>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
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
                  {saving ? 'Creating...' : 'Add Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
