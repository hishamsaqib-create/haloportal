'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  userType: string
  active: boolean
  lastLogin: string | null
  dentistName: string | null
}

interface InviteRow {
  id: string
  email: string
  role: string
  userType: string
  createdAt: string
  expiresAt: string
}

export function ClinicUserManager({
  users: initialUsers,
  pendingInvites,
  clinicId,
}: {
  users: UserRow[]
  pendingInvites: InviteRow[]
  clinicId: string
}) {
  const [users] = useState(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'CLINIC_FINANCE',
    userType: 'CLINIC',
  })
  const [inviting, setInviting] = useState(false)

  async function handleInvite() {
    setInviting(true)
    await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...inviteForm,
        clinicId,
      }),
    })
    setInviting(false)
    setShowInvite(false)
    setInviteForm({ email: '', name: '', role: 'CLINIC_FINANCE', userType: 'CLINIC' })
  }

  return (
    <div>
      {/* Invite button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Invite User
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Invite a User</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="CLINIC_ADMIN">Clinic Admin</option>
                <option value="CLINIC_FINANCE">Clinic Finance</option>
                <option value="DENTIST_USER">Dentist</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteForm.email || !inviteForm.name}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current users */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Active Users</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  {u.dentistName && <div className="text-xs text-gray-500">Dentist: {u.dentistName}</div>}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-3 text-xs font-medium text-gray-600">{u.userType}</td>
                <td className="px-6 py-3 text-xs font-medium text-gray-600">{u.role.replace(/_/g, ' ')}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No users yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Pending Invites</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingInvites.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-6 py-3 text-sm text-gray-900">{inv.email}</td>
                  <td className="px-6 py-3 text-xs text-gray-600">{inv.role.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(inv.createdAt)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(inv.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
