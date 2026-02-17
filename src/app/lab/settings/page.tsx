'use client'

import { useState, useEffect } from 'react'
import { DEPARTMENTS, DEPARTMENT_LABELS, CASE_STATUSES, CASE_STATUS_LABELS } from '@/lib/constants'

interface DeptStatusConfig {
  id: string
  department: string
  statuses: string
  active: boolean
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  category: string | null
  active: boolean
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<'statuses' | 'templates' | 'system'>('statuses')
  const [deptConfigs, setDeptConfigs] = useState<DeptStatusConfig[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const [configRes, templateRes] = await Promise.all([
        fetch('/api/settings/department-statuses').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/email/templates').then((r) => (r.ok ? r.json() : null)),
      ])
      if (configRes) setDeptConfigs(configRes.data || [])
      if (templateRes) setTemplates(templateRes.data || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { key: 'statuses' as const, label: 'Department Status Config' },
    { key: 'templates' as const, label: 'Email Templates' },
    { key: 'system' as const, label: 'System Info' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure system settings and department workflows</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeSection === section.key
                    ? 'bg-brand-50 text-brand-700 border-l-2 border-brand-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-24 text-center text-sm text-gray-500">
              Loading settings...
            </div>
          ) : activeSection === 'statuses' ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Department Status Configuration</h2>
                <p className="mb-6 text-sm text-gray-500">
                  Configure the status workflow for each department. Statuses determine the order
                  of case progression in each department.
                </p>

                <div className="space-y-6">
                  {DEPARTMENTS.map((dept) => {
                    const config = deptConfigs.find((c) => c.department === dept)
                    let statuses: string[] = []
                    if (config?.statuses) {
                      try {
                        statuses = JSON.parse(config.statuses)
                      } catch {
                        statuses = []
                      }
                    }

                    return (
                      <div key={dept} className="rounded-lg border border-gray-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {DEPARTMENT_LABELS[dept]}
                          </h3>
                          {config && (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                config.active ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                              }`}
                            >
                              {config.active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </div>
                        {statuses.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {statuses.map((status, idx) => (
                              <div key={status} className="flex items-center">
                                {idx > 0 && (
                                  <svg className="mx-0.5 h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                  {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] || status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {CASE_STATUSES.map((status, idx) => (
                              <div key={status} className="flex items-center">
                                {idx > 0 && (
                                  <svg className="mx-0.5 h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                                <span className="inline-flex rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                  {CASE_STATUS_LABELS[status] || status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          {config
                            ? 'Custom configuration active'
                            : 'Using default status workflow. Save a custom configuration to override.'}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  Status workflow editor coming soon. Currently managed via database.
                </div>
              </div>
            </div>
          ) : activeSection === 'templates' ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
                <p className="text-sm text-gray-500">Manage email templates used for automated communications.</p>
              </div>

              {templates.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-500">
                  No email templates configured. Templates can be added via the API.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Category</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {templates.map((template) => (
                        <tr key={template.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">{template.name}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">{template.subject}</td>
                          <td className="px-6 py-3">
                            {template.category ? (
                              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {template.category}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">---</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                template.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {template.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-gray-200 px-6 py-4">
                <p className="text-xs text-gray-400">
                  Template editor coming soon. Templates support variables like {'{{caseNumber}}'}, {'{{clinicName}}'}, etc.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">System Information</h2>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Application</dt>
                    <dd className="text-sm font-medium text-gray-900">Halo Lab Portal</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Version</dt>
                    <dd className="text-sm font-medium text-gray-900">1.0.0</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Framework</dt>
                    <dd className="text-sm font-medium text-gray-900">Next.js (App Router)</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Database</dt>
                    <dd className="text-sm font-medium text-gray-900">SQLite (Prisma ORM)</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Authentication</dt>
                    <dd className="text-sm font-medium text-gray-900">NextAuth.js (Credentials)</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-sm text-gray-500">Environment</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        Development
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Configuration</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Default VAT Rate</dt>
                    <dd className="text-sm font-medium text-gray-900">20%</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Default Payment Terms</dt>
                    <dd className="text-sm font-medium text-gray-900">30 days</dd>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-500">Case Number Format</dt>
                    <dd className="text-sm font-mono text-gray-900">HL-YYYY-XXXX</dd>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <dt className="text-sm text-gray-500">Invoice Number Format</dt>
                    <dd className="text-sm font-mono text-gray-900">INV-YYYYMM-XXXX</dd>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500">
                  System configuration editor coming soon.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
