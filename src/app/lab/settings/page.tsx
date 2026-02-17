'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; category: string | null; active: boolean }[]>([])

  useEffect(() => {
    fetch('/api/email/templates').then(r => r.ok ? r.json() : { templates: [] }).then(d => setTemplates(d.templates || []))
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">System configuration</p>
      </div>

      <div className="space-y-6">
        {/* Department Status Config */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Department Status Pipeline</h2>
          <div className="space-y-4">
            {['CERAMICS', 'APPLIANCES', 'DSD'].map(dept => (
              <div key={dept}>
                <h3 className="text-xs font-medium text-gray-700 mb-2">{dept}</h3>
                <div className="flex flex-wrap gap-1">
                  {(dept === 'APPLIANCES'
                    ? ['NEW', 'REVIEWED', 'IN_PRODUCTION', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']
                    : ['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED']
                  ).map((s, i) => (
                    <div key={s} className="flex items-center">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{s.replace(/_/g, ' ')}</span>
                      {i < (dept === 'APPLIANCES' ? 6 : 8) && <span className="mx-1 text-gray-300">&rarr;</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Email Templates */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Email Templates</h2>
          <div className="space-y-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{t.category || 'general'}</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">System Information</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-sm text-gray-500">Platform</dt><dd className="text-sm text-gray-900">Halo Lab Portal v0.1.0</dd></div>
            <div className="flex justify-between"><dt className="text-sm text-gray-500">Database</dt><dd className="text-sm text-gray-900">SQLite (dev) / PostgreSQL (production)</dd></div>
            <div className="flex justify-between"><dt className="text-sm text-gray-500">Framework</dt><dd className="text-sm text-gray-900">Next.js 14 + Prisma + NextAuth</dd></div>
          </dl>
        </div>
      </div>
    </div>
  )
}
