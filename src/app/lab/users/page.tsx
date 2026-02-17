'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  userType: string
  role: string
  active: boolean
  lastLogin: string | null
  clinic: { id: string; name: string } | null
  dentist: { id: string; name: string } | null
}

const USER_TYPE_LABELS: Record<string, string> = {
  INTERNAL: 'Internal',
  DENTIST: 'Dentist',
  CLINIC: 'Clinic',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  LAB_MANAGER: 'Lab Manager',
  LAB_STAFF: 'Lab Staff',
  CLINIC_ADMIN: 'Clinic Admin',
  CLINIC_FINANCE: 'Clinic Finance',
  DENTIST_USER: 'Dentist User',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')

  // Invite form state
  const [invEmail, setInvEmail] = useState('')
  const [invName, setInvName] = useState('')
  const [invType, setInvType] = useState('INTERNAL')
  const [invRole, setInvRole] = useState('LAB_STAFF')
  const [invClinicId, setInvClinicId] = useState('')

  // Clinics for assignment
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetchUsers()
  }, [filterType])

  async function fetchUsers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterType) params.set('userType', filterType)
    try {
      const res = await fetch(`/api/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function openInviteModal() {
    setInvEmail('')
    setInvName('')
    setInvType('INTERNAL')
    setInvRole('LAB_STAFF')
    setInvClinicId('')
    setError(null)
    setShowInvite(true)

    // Load clinics
    try {
      const res = await fetch('/api/clinics')
      if (res.ok) {
        const data = await res.json()
        setClinics(data.data || [])
      }
    } catch {
      // ignore
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invEmail,
          name: invName,
          userType: invType,
          role: invRole,
          clinicId: invClinicId || undefined,
        }),
      })
      if (res.ok) {
        setShowInvite(false)
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to invite user')
      }
    } catch {
      setError('Failed to invite user')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      })
      if (res.ok) {
        fetchUsers()
      }
    } catch {
      // ignore
    }
  }

  function getRolesForType(type: string): string[] {
    switch (type) {
      case 'INTERNAL':
        return ['SUPER_ADMIN', 'LAB_MANAGER', 'LAB_STAFF']
      case 'CLINIC':
        return ['CLINIC_ADMIN', 'CLINIC_FINANCE']
      case 'DENTIST':
        return ['DENTIST_USER']
      default:
        return []
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">Manage user accounts and invitations</p>
        </div>
        <button
          onClick={openInviteModal}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Invite User
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="INTERNAL">Internal</option>
          <option value="CLINIC">Clinic</option>
          <option value="DENTIST">Dentist</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Last Login</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {USER_TYPE_LABELS[user.userType] || user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {ROLE_LABELS[user.role] || user.role}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {user.clinic?.name || user.dentist?.name || '---'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => toggleActive(user.id, user.active)}
                        className={`text-sm font-medium ${
                          user.active
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {user.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
              <button
                onClick={() => setShowInvite(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={invEmail}
                    onChange={(e) => setInvEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invType}
                      onChange={(e) => {
                        setInvType(e.target.value)
                        const roles = getRolesForType(e.target.value)
                        setInvRole(roles[0] || '')
                      }}
                      className={inputClass}
                    >
                      <option value="INTERNAL">Internal</option>
                      <option value="CLINIC">Clinic</option>
                      <option value="DENTIST">Dentist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={invRole}
                      onChange={(e) => setInvRole(e.target.value)}
                      className={inputClass}
                    >
                      {getRolesForType(invType).map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role] || role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(invType === 'CLINIC' || invType === 'DENTIST') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                    <select
                      value={invClinicId}
                      onChange={(e) => setInvClinicId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select clinic</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
