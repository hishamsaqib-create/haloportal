'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'

interface UserRow {
  id: string
  name: string
  email: string
  userType: string
  role: string
  active: boolean
  lastLogin: string | null
  clinic?: { name: string } | null
  dentist?: { name: string } | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', userType: 'INTERNAL', role: 'LAB_STAFF', clinicId: '', dentistId: '' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) { const data = await res.json(); setUsers(data.users || []) }
    setLoading(false)
  }

  async function handleInvite() {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowInvite(false)
    setForm({ email: '', name: '', userType: 'INTERNAL', role: 'LAB_STAFF', clinicId: '', dentistId: '' })
    fetchUsers()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">Manage all system users</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors">
          Add User
        </button>
      </div>

      {showInvite && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Add User</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Name</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">User Type</label>
              <select value={form.userType} onChange={(e) => setForm({ ...form, userType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="INTERNAL">Internal (Lab Staff)</option>
                <option value="CLINIC">Clinic User</option>
                <option value="DENTIST">Dentist User</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="LAB_MANAGER">Lab Manager</option>
                <option value="LAB_STAFF">Lab Staff</option>
                <option value="CLINIC_ADMIN">Clinic Admin</option>
                <option value="CLINIC_FINANCE">Clinic Finance</option>
                <option value="DENTIST_USER">Dentist User</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleInvite} disabled={!form.name || !form.email} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">Create</button>
            <button onClick={() => setShowInvite(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  {u.clinic && <div className="text-xs text-gray-500">{u.clinic.name}</div>}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-3"><span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{u.userType}</span></td>
                <td className="px-6 py-3 text-sm text-gray-600">{u.role.replace(/_/g, ' ')}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
