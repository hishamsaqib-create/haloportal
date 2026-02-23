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
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')

  // Create form state
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formType, setFormType] = useState('INTERNAL')
  const [formRole, setFormRole] = useState('LAB_STAFF')
  const [formClinicId, setFormClinicId] = useState('')

  // Password reset modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pwUserId, setPwUserId] = useState('')
  const [pwUserName, setPwUserName] = useState('')
  const [pwNewPassword, setPwNewPassword] = useState('')

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

  async function openCreateModal() {
    setFormEmail('')
    setFormName('')
    setFormPassword('')
    setFormType('INTERNAL')
    setFormRole('LAB_STAFF')
    setFormClinicId('')
    setError(null)
    setShowCreate(true)

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (formPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          name: formName,
          password: formPassword,
          userType: formType,
          role: formRole,
          clinicId: formClinicId || undefined,
        }),
      })
      if (res.ok) {
        setShowCreate(false)
        setSuccess(`User "${formName}" created successfully`)
        setTimeout(() => setSuccess(null), 3000)
        fetchUsers()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create user')
      }
    } catch {
      setError('Failed to create user')
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

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwNewPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${pwUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwNewPassword }),
      })
      if (res.ok) {
        setShowPasswordModal(false)
        setPwNewPassword('')
        setSuccess(`Password updated for ${pwUserName}`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to set password')
      }
    } catch {
      setError('Failed to set password')
    } finally {
      setSaving(false)
    }
  }

  function openPasswordModal(user: User) {
    setPwUserId(user.id)
    setPwUserName(user.name)
    setPwNewPassword('')
    setError(null)
    setShowPasswordModal(true)
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
          <p className="text-sm text-gray-500">Manage user accounts and passwords</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create User
        </button>
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="INTERNAL">Internal</option>
          <option value="CLINIC">Clinic</option>
          <option value="DENTIST">Dentist</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Name</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Email</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Role</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Clinic</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Last Login</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        {USER_TYPE_LABELS[user.userType] || user.userType}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {ROLE_LABELS[user.role] || user.role}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {user.clinic?.name || user.dentist?.name || '\u2014'}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          user.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPasswordModal(user)}
                          className="text-xs font-medium text-brand-700 hover:text-brand-800"
                        >
                          Set Password
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => toggleActive(user.id, user.active)}
                          className={`text-xs font-medium ${
                            user.active
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {user.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={inputClass} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className={inputClass}
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        setFormType(e.target.value)
                        const roles = getRolesForType(e.target.value)
                        setFormRole(roles[0] || '')
                      }}
                      className={inputClass}
                    >
                      <option value="INTERNAL">Internal</option>
                      <option value="CLINIC">Clinic</option>
                      <option value="DENTIST">Dentist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className={inputClass}>
                      {getRolesForType(formType).map((role) => (
                        <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(formType === 'CLINIC' || formType === 'DENTIST') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                    <select value={formClinicId} onChange={(e) => setFormClinicId(e.target.value)} className={inputClass}>
                      <option value="">Select clinic</option>
                      {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Set Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSetPassword} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <p className="mb-4 text-sm text-gray-600">
                Set a new password for <span className="font-semibold">{pwUserName}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type="password"
                  value={pwNewPassword}
                  onChange={(e) => setPwNewPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  autoFocus
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
