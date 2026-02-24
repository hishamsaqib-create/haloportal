'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEPARTMENTS, DEPARTMENT_LABELS, CASE_STATUSES, CASE_STATUS_LABELS } from '@/lib/constants'
import toast from 'react-hot-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionKey = 'general' | 'billing' | 'branding' | 'clinics' | 'integrations' | 'workflows' | 'templates' | 'email-preview' | 'notifications'

interface DeptStatusConfig {
  id: string
  department: string
  statuses: string
  active: boolean
}

interface ClinicWithDentists {
  id: string
  name: string
  email: string | null
  phone: string | null
  portalPassword: string | null
  active: boolean
  dentists: { id: string; name: string; email: string | null; portalPassword: string | null; notificationChannel: string; active: boolean }[]
  _count: { cases: number; dentists: number }
}

interface NotificationRule {
  id: string
  name: string
  trigger: string
  triggerValue: string | null
  channel: string
  templateId: string | null
  recipient: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
  category: string | null
  active: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: 'general',
    label: 'General',
    description: 'Lab identity and numbering formats',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.333.183-.582.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Tax rates, payment terms and currency',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>,
  },
  {
    key: 'branding',
    label: 'Branding',
    description: 'Appearance, colors and contact details',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" /></svg>,
  },
  {
    key: 'clinics',
    label: 'Clinic Portal',
    description: 'Manage clinic passwords and dentists',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>,
  },
  {
    key: 'integrations',
    label: 'Integrations',
    description: 'WhatsApp, Monday.com and JotForm',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>,
  },
  {
    key: 'workflows',
    label: 'Dept. Workflows',
    description: 'Department status configurations',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>,
  },
  {
    key: 'templates',
    label: 'Email Templates',
    description: 'Automated email configurations',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>,
  },
  {
    key: 'email-preview',
    label: 'Email Previews',
    description: 'Preview emails sent to clinics and referrals',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    description: 'Notification rules and automations',
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>,
  },
]

const ACCENT_SWATCHES = [
  '#0071e3', '#34c759', '#ff9500', '#ff3b30', '#af52de',
  '#ff2d55', '#5856d6', '#00c7be', '#1d1d1f', '#6e6e73',
]

const CURRENCY_OPTIONS = [
  { value: 'GBP', label: 'GBP - British Pound (\u00a3)' },
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (\u20ac)' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'ZAR', label: 'ZAR - South African Rand' },
]

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function SectionCard({ title, description, children, onSave, saving }: {
  title: string; description: string; children: React.ReactNode; onSave?: () => void; saving?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
      {onSave && (
        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            {saving && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', mono }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-0 ${mono ? 'font-mono' : ''}`}
    />
  )
}

function TextAreaInput({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-0 resize-none"
    />
  )
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-0 appearance-none"
    >
      {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  )
}

function InfoBox({ variant = 'info', title, children }: { variant?: 'info' | 'warning'; title: string; children: React.ReactNode }) {
  const styles = variant === 'warning'
    ? { border: 'border-amber-100', bg: 'bg-amber-50/50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', titleColor: 'text-amber-800', textColor: 'text-amber-700' }
    : { border: 'border-gray-100', bg: 'bg-gray-50/60', iconBg: 'bg-gray-200/70', iconColor: 'text-gray-500', titleColor: 'text-gray-700', textColor: 'text-gray-500' }
  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>
          <svg className={`h-4 w-4 ${styles.iconColor}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
        </div>
        <div>
          <p className={`text-sm font-medium ${styles.titleColor}`}>{title}</p>
          <p className={`mt-0.5 text-xs ${styles.textColor}`}>{children}</p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('general')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [deptConfigs, setDeptConfigs] = useState<DeptStatusConfig[]>([])
  const [loadingDept, setLoadingDept] = useState(true)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [savingBranding, setSavingBranding] = useState(false)
  const [savingIntegrations, setSavingIntegrations] = useState(false)
  const [savingWorkflows, setSavingWorkflows] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [previewEmail, setPreviewEmail] = useState<'clinician' | 'referral' | null>(null)
  const [mondayTestResult, setMondayTestResult] = useState<{ success: boolean; boardName?: string; error?: string } | null>(null)
  const [testingMonday, setTestingMonday] = useState(false)
  const [clinics, setClinics] = useState<ClinicWithDentists[]>([])
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [editingClinic, setEditingClinic] = useState<ClinicWithDentists | null>(null)
  const [savingClinic, setSavingClinic] = useState(false)
  const [showAddDentist, setShowAddDentist] = useState<string | null>(null)
  const [newDentistName, setNewDentistName] = useState('')
  const [newDentistEmail, setNewDentistEmail] = useState('')
  const [addingDentist, setAddingDentist] = useState(false)
  const [editingDentistPasswords, setEditingDentistPasswords] = useState<Record<string, string>>({})
  const [savingDentistPassword, setSavingDentistPassword] = useState<string | null>(null)
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([])
  const [loadingNotificationRules, setLoadingNotificationRules] = useState(true)
  const [savingNotificationChannel, setSavingNotificationChannel] = useState<string | null>(null)
  const [addingRule, setAddingRule] = useState(false)
  const [savingRule, setSavingRule] = useState(false)
  const [newRule, setNewRule] = useState({ name: '', trigger: 'CASE_CREATED', triggerValue: '', channel: 'EMAIL', recipient: 'DENTIST' })

  // Editable workflow state
  const [editedWorkflows, setEditedWorkflows] = useState<Record<string, string[]>>({})

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadAllSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const json = await res.json()
      const data: Record<string, { value: string }> = json.data || {}
      const flat: Record<string, string> = {}
      for (const [key, entry] of Object.entries(data)) {
        flat[key] = entry.value
      }
      setSettings(flat)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  const loadDeptConfigs = useCallback(async () => {
    setLoadingDept(true)
    try {
      const res = await fetch('/api/settings/department-statuses')
      if (!res.ok) throw new Error('Failed to load department configs')
      const json = await res.json()
      const configs = json.data || []
      setDeptConfigs(configs)
      // Initialize editable workflows
      const edited: Record<string, string[]> = {}
      for (const config of configs) {
        try { edited[config.department] = JSON.parse(config.statuses) } catch { edited[config.department] = [] }
      }
      setEditedWorkflows(edited)
    } catch {
      toast.error('Failed to load department configurations')
    } finally {
      setLoadingDept(false)
    }
  }, [])

  const loadClinics = useCallback(async () => {
    setLoadingClinics(true)
    try {
      const res = await fetch('/api/clinics')
      if (!res.ok) throw new Error('Failed to load clinics')
      const json = await res.json()
      // For each clinic, also load its dentists
      const clinicList = json.data || []
      const enriched: ClinicWithDentists[] = []
      for (const c of clinicList) {
        try {
          const dRes = await fetch(`/api/clinics/${c.id}`)
          if (dRes.ok) {
            const dJson = await dRes.json()
            enriched.push(dJson.data)
          } else {
            enriched.push({ ...c, dentists: [], portalPassword: null })
          }
        } catch {
          enriched.push({ ...c, dentists: [], portalPassword: null })
        }
      }
      setClinics(enriched)
    } catch {
      toast.error('Failed to load clinics')
    } finally {
      setLoadingClinics(false)
    }
  }, [])

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/email/templates')
      if (!res.ok) throw new Error('Failed to load templates')
      const json = await res.json()
      setTemplates(json.data || [])
    } catch {
      toast.error('Failed to load email templates')
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  const loadNotificationRules = useCallback(async () => {
    setLoadingNotificationRules(true)
    try {
      const res = await fetch('/api/settings/notification-rules')
      if (!res.ok) throw new Error('Failed to load notification rules')
      const json = await res.json()
      setNotificationRules(json.data || [])
    } catch {
      toast.error('Failed to load notification rules')
    } finally {
      setLoadingNotificationRules(false)
    }
  }, [])

  useEffect(() => {
    loadAllSettings()
    loadDeptConfigs()
    loadTemplates()
    loadClinics()
    loadNotificationRules()
  }, [loadAllSettings, loadDeptConfigs, loadTemplates, loadClinics, loadNotificationRules])

  // -----------------------------------------------------------------------
  // Setting helpers
  // -----------------------------------------------------------------------

  function s(key: string): string { return settings[key] ?? '' }
  function setS(key: string, value: string) { setSettings((prev) => ({ ...prev, [key]: value })) }

  async function saveSettings(keys: string[], setFn: (v: boolean) => void) {
    setFn(true)
    try {
      const payload: Record<string, string> = {}
      for (const key of keys) payload[key] = s(key)
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(err?.error || 'Failed to save') }
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setFn(false)
    }
  }

  async function saveWorkflowConfig(department: string, statuses: string[]) {
    setSavingWorkflows(true)
    try {
      const res = await fetch('/api/settings/department-statuses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, statuses }),
      })
      if (!res.ok) throw new Error('Failed to save workflow')
      toast.success(`${DEPARTMENT_LABELS[department as keyof typeof DEPARTMENT_LABELS]} workflow saved`)
      loadDeptConfigs()
    } catch {
      toast.error('Failed to save workflow configuration')
    } finally {
      setSavingWorkflows(false)
    }
  }

  async function saveTemplate(template: EmailTemplate) {
    setSavingTemplate(true)
    try {
      const res = await fetch(`/api/email/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          active: template.active,
        }),
      })
      if (!res.ok) throw new Error('Failed to save template')
      toast.success('Template saved')
      setEditingTemplate(null)
      loadTemplates()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function testMondayConnection() {
    setTestingMonday(true)
    setMondayTestResult(null)
    try {
      const res = await fetch('/api/monday?action=test')
      const json = await res.json()
      setMondayTestResult(json.data)
    } catch {
      setMondayTestResult({ success: false, error: 'Connection failed' })
    } finally {
      setTestingMonday(false)
    }
  }

  // -----------------------------------------------------------------------
  // Clinic helpers
  // -----------------------------------------------------------------------

  async function saveClinicPortalPassword(clinicId: string, portalPassword: string) {
    setSavingClinic(true)
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalPassword: portalPassword || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Portal password saved')
      loadClinics()
    } catch {
      toast.error('Failed to save portal password')
    } finally {
      setSavingClinic(false)
    }
  }

  async function addDentistToClinic(clinicId: string) {
    if (!newDentistName.trim()) return
    setAddingDentist(true)
    try {
      const res = await fetch('/api/dentists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          name: newDentistName.trim(),
          email: newDentistEmail.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to add dentist')
      toast.success('Dentist added')
      setNewDentistName('')
      setNewDentistEmail('')
      setShowAddDentist(null)
      loadClinics()
    } catch {
      toast.error('Failed to add dentist')
    } finally {
      setAddingDentist(false)
    }
  }

  async function saveDentistPortalPassword(dentistId: string) {
    setSavingDentistPassword(dentistId)
    try {
      const password = editingDentistPasswords[dentistId] ?? ''
      const res = await fetch(`/api/dentists/${dentistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalPassword: password || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Dentist portal password saved')
      loadClinics()
    } catch {
      toast.error('Failed to save dentist portal password')
    } finally {
      setSavingDentistPassword(null)
    }
  }

  // -----------------------------------------------------------------------
  // Notification helpers
  // -----------------------------------------------------------------------

  async function saveDentistNotificationChannel(dentistId: string, channel: string) {
    setSavingNotificationChannel(dentistId)
    try {
      const res = await fetch(`/api/dentists/${dentistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationChannel: channel }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Notification preference saved')
      loadClinics()
    } catch {
      toast.error('Failed to save notification preference')
    } finally {
      setSavingNotificationChannel(null)
    }
  }

  async function createNotificationRule() {
    if (!newRule.name.trim()) return
    setSavingRule(true)
    try {
      const res = await fetch('/api/settings/notification-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRule.name.trim(),
          trigger: newRule.trigger,
          triggerValue: newRule.triggerValue || null,
          channel: newRule.channel,
          recipient: newRule.recipient,
        }),
      })
      if (!res.ok) throw new Error('Failed to create rule')
      toast.success('Notification rule created')
      setNewRule({ name: '', trigger: 'CASE_CREATED', triggerValue: '', channel: 'EMAIL', recipient: 'DENTIST' })
      setAddingRule(false)
      loadNotificationRules()
    } catch {
      toast.error('Failed to create notification rule')
    } finally {
      setSavingRule(false)
    }
  }

  async function toggleNotificationRule(ruleId: string, active: boolean) {
    try {
      const res = await fetch('/api/settings/notification-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, active }),
      })
      if (!res.ok) throw new Error('Failed to update rule')
      toast.success(`Rule ${active ? 'enabled' : 'disabled'}`)
      loadNotificationRules()
    } catch {
      toast.error('Failed to update notification rule')
    }
  }

  async function updateNotificationRuleChannel(ruleId: string, channel: string) {
    try {
      const res = await fetch('/api/settings/notification-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, channel }),
      })
      if (!res.ok) throw new Error('Failed to update rule')
      toast.success('Rule channel updated')
      loadNotificationRules()
    } catch {
      toast.error('Failed to update notification rule')
    }
  }

  // -----------------------------------------------------------------------
  // Workflow helpers
  // -----------------------------------------------------------------------

  function toggleWorkflowStatus(department: string, status: string) {
    setEditedWorkflows((prev) => {
      const current = prev[department] || []
      if (current.includes(status)) {
        return { ...prev, [department]: current.filter((s) => s !== status) }
      } else {
        // Insert in correct order based on CASE_STATUSES
        const newStatuses = [...current, status].sort(
          (a, b) => CASE_STATUSES.indexOf(a as typeof CASE_STATUSES[number]) - CASE_STATUSES.indexOf(b as typeof CASE_STATUSES[number])
        )
        return { ...prev, [department]: newStatuses }
      }
    })
  }

  // -----------------------------------------------------------------------
  // Section renderers
  // -----------------------------------------------------------------------

  function renderGeneral() {
    if (loadingSettings) return <LoadingPlaceholder />
    return (
      <SectionCard title="General Settings" description="Configure your lab name and document numbering formats."
        onSave={() => saveSettings(['lab_name', 'case_number_format', 'invoice_number_format'], setSavingGeneral)} saving={savingGeneral}>
        <div className="space-y-5">
          <FieldGroup label="Lab Name" hint="The name displayed across the portal and on documents.">
            <TextInput value={s('lab_name')} onChange={(v) => setS('lab_name', v)} placeholder="Halo Dental Lab" />
          </FieldGroup>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FieldGroup label="Case Number Format" hint="Use YYYY for year, XXXX for sequence.">
              <TextInput value={s('case_number_format')} onChange={(v) => setS('case_number_format', v)} placeholder="HL-YYYY-XXXX" mono />
            </FieldGroup>
            <FieldGroup label="Invoice Number Format" hint="Use YYYY for year, MM for month, XXXX for sequence.">
              <TextInput value={s('invoice_number_format')} onChange={(v) => setS('invoice_number_format', v)} placeholder="INV-YYYYMM-XXXX" mono />
            </FieldGroup>
          </div>
        </div>
      </SectionCard>
    )
  }

  function renderBilling() {
    if (loadingSettings) return <LoadingPlaceholder />
    return (
      <SectionCard title="Billing Settings" description="Configure tax rates, payment terms and default currency for invoices."
        onSave={() => saveSettings(['vat_rate', 'payment_terms_days', 'currency'], setSavingBilling)} saving={savingBilling}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <FieldGroup label="VAT Rate (%)" hint="Applied to all new invoices by default.">
              <TextInput type="number" value={s('vat_rate')} onChange={(v) => setS('vat_rate', v)} placeholder="20" />
            </FieldGroup>
            <FieldGroup label="Payment Terms (days)" hint="Default number of days until invoice is due.">
              <TextInput type="number" value={s('payment_terms_days')} onChange={(v) => setS('payment_terms_days', v)} placeholder="30" />
            </FieldGroup>
            <FieldGroup label="Currency" hint="Default currency for new invoices.">
              <SelectInput value={s('currency') || 'GBP'} onChange={(v) => setS('currency', v)} options={CURRENCY_OPTIONS} />
            </FieldGroup>
          </div>
          <InfoBox title="About billing defaults">
            These values are used as defaults when creating new invoices. Individual invoices can override these values. Changes here will not affect existing invoices.
          </InfoBox>
        </div>
      </SectionCard>
    )
  }

  function renderBranding() {
    if (loadingSettings) return <LoadingPlaceholder />
    const currentAccent = s('theme_accent_color') || '#0071e3'
    return (
      <SectionCard title="Branding" description="Customise the portal appearance and set your lab contact details."
        onSave={() => saveSettings(['lab_name', 'lab_email', 'lab_phone', 'lab_address', 'theme_accent_color'], setSavingBranding)} saving={savingBranding}>
        <div className="space-y-6">
          <FieldGroup label="Accent Color" hint="Used for buttons, links and active elements across the portal.">
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_SWATCHES.map((color) => (
                <button key={color} type="button" onClick={() => setS('theme_accent_color', color)}
                  className={`relative h-8 w-8 rounded-full border-2 transition-all ${currentAccent === color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: color }} title={color}>
                  {currentAccent === color && (
                    <svg className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                <label className="text-xs text-gray-500">Custom:</label>
                <input type="color" value={currentAccent} onChange={(e) => setS('theme_accent_color', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-gray-200 p-0.5" />
                <input type="text" value={currentAccent} onChange={(e) => setS('theme_accent_color', e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-1.5 font-mono text-xs text-gray-700 outline-none focus:border-gray-400 focus:bg-white" placeholder="#0071e3" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: currentAccent }} />
              <div>
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <p className="font-mono text-xs text-gray-400">{currentAccent}</p>
              </div>
            </div>
          </FieldGroup>
          <hr className="border-gray-100" />
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldGroup label="Lab Name"><TextInput value={s('lab_name')} onChange={(v) => setS('lab_name', v)} placeholder="Halo Dental Lab" /></FieldGroup>
              <FieldGroup label="Email Address"><TextInput value={s('lab_email')} onChange={(v) => setS('lab_email', v)} placeholder="lab@halolab.co.uk" type="email" /></FieldGroup>
            </div>
            <FieldGroup label="Phone Number"><TextInput value={s('lab_phone')} onChange={(v) => setS('lab_phone', v)} placeholder="+44 20 1234 5678" /></FieldGroup>
            <FieldGroup label="Address" hint="Displayed on invoices and correspondence.">
              <TextAreaInput value={s('lab_address')} onChange={(v) => setS('lab_address', v)} placeholder="123 High Street&#10;London&#10;SW1A 1AA" rows={3} />
            </FieldGroup>
          </div>
        </div>
      </SectionCard>
    )
  }

  function renderIntegrations() {
    if (loadingSettings) return <LoadingPlaceholder />
    return (
      <div className="space-y-6">
        {/* WhatsApp */}
        <SectionCard title="WhatsApp Business API" description="Connect your WhatsApp Business account for automated messaging."
          onSave={() => saveSettings(['whatsapp_phone_id', 'whatsapp_access_token', 'whatsapp_verify_token', 'whatsapp_business_id'], setSavingIntegrations)} saving={savingIntegrations}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldGroup label="Phone Number ID" hint="Found in your Meta Business Suite app dashboard.">
                <TextInput value={s('whatsapp_phone_id')} onChange={(v) => setS('whatsapp_phone_id', v)} placeholder="e.g. 123456789012345" mono />
              </FieldGroup>
              <FieldGroup label="Business Account ID" hint="Your WhatsApp Business Account ID from Meta.">
                <TextInput value={s('whatsapp_business_id')} onChange={(v) => setS('whatsapp_business_id', v)} placeholder="e.g. 123456789012345" mono />
              </FieldGroup>
            </div>
            <FieldGroup label="Access Token" hint="Permanent access token generated from your Meta app.">
              <TextInput value={s('whatsapp_access_token')} onChange={(v) => setS('whatsapp_access_token', v)} placeholder="EAABsbCS..." mono />
            </FieldGroup>
            <FieldGroup label="Webhook Verify Token" hint="A custom string you set when configuring the webhook in Meta.">
              <TextInput value={s('whatsapp_verify_token')} onChange={(v) => setS('whatsapp_verify_token', v)} placeholder="your-verify-token" mono />
            </FieldGroup>
            <InfoBox variant="warning" title="Security notice">
              Access tokens are stored securely in the database. Avoid sharing these values. Rotate your tokens regularly.
            </InfoBox>
          </div>
        </SectionCard>

        {/* Monday.com */}
        <SectionCard title="Monday.com Sync" description="Sync cases to your Monday.com board as a backup. New cases will automatically push to your board."
          onSave={() => saveSettings(['monday_api_key', 'monday_board_id'], setSavingIntegrations)} saving={savingIntegrations}>
          <div className="space-y-5">
            <FieldGroup label="API Key" hint="Found in Monday.com > Profile > Admin > API. Use a personal API token.">
              <TextInput value={s('monday_api_key')} onChange={(v) => setS('monday_api_key', v)} placeholder="eyJhbGci..." mono />
            </FieldGroup>
            <FieldGroup label="Board ID" hint="The numeric ID of your Monday.com board. Found in the board URL.">
              <TextInput value={s('monday_board_id')} onChange={(v) => setS('monday_board_id', v)} placeholder="e.g. 1234567890" mono />
            </FieldGroup>
            <div className="flex items-center gap-3">
              <button onClick={testMondayConnection} disabled={testingMonday}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 disabled:opacity-50">
                {testingMonday ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                )}
                Test Connection
              </button>
              {mondayTestResult && (
                <span className={`text-sm font-medium ${mondayTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {mondayTestResult.success ? `Connected to "${mondayTestResult.boardName}"` : mondayTestResult.error}
                </span>
              )}
            </div>
            <InfoBox title="How Monday.com sync works">
              When a new case is created (via JotForm or manually), it will automatically be pushed to your Monday.com board.
              Status changes in HaloPortal will also sync to Monday.com. This acts as a backup while you transition to HaloPortal.
            </InfoBox>
          </div>
        </SectionCard>

        {/* JotForm */}
        <SectionCard title="JotForm Webhook" description="Receive prescription and case data directly from your website forms.">
          <div className="space-y-5">
            <FieldGroup label="Webhook URL" hint="Set this as your JotForm webhook URL to receive form submissions automatically.">
              <div className="flex items-center gap-2">
                <input type="text" readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/jotform` : '/api/webhooks/jotform'}
                  className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-700 outline-none" />
                <button onClick={() => {
                  const url = `${window.location.origin}/api/webhooks/jotform`
                  navigator.clipboard.writeText(url)
                  toast.success('Webhook URL copied')
                }} className="flex-shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                  Copy
                </button>
              </div>
            </FieldGroup>
            <InfoBox title="How JotForm integration works">
              When a patient submits a form on halolab.co.uk, JotForm sends the data to this webhook.
              HaloPortal automatically creates a new case, matches the clinic and dentist, and the case appears on your dashboard instantly.
              The data also syncs to Monday.com if configured above.
            </InfoBox>
            <div className="rounded-xl border border-gray-200 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Required JotForm Fields</h4>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500">
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">clinicName</code> Clinic name</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">dentistName</code> Dentist name</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">patientRef</code> Patient reference</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">department</code> Department</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">product</code> Product name</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">dueDate</code> Due date</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">shade</code> Shade</span>
                <span><code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-700">notes</code> Instructions</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  function renderClinics() {
    if (loadingClinics) return <LoadingPlaceholder />
    return (
      <div className="space-y-6">
        <SectionCard title="Clinic Portal Access" description="Each clinic gets a unique password. When they enter it on halolab.co.uk, they see only their own dentists in the submission forms.">
          <div className="space-y-4">
            <InfoBox title="How clinic passwords work">
              Set a password for each clinic below. When a clinic receptionist visits halolab.co.uk and enters their password, the system shows only that clinic&apos;s dentists in the dropdown. Each clinic sees only their own team.
            </InfoBox>

            {clinics.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500">No clinics yet. Add clinics from the Clinics page first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clinics.map((clinic) => (
                  <div key={clinic.id} className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* Clinic header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{clinic.name}</h3>
                        <p className="text-xs text-gray-500">
                          {clinic._count?.dentists || clinic.dentists?.length || 0} dentists &middot; {clinic._count?.cases || 0} cases
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingClinic(editingClinic?.id === clinic.id ? null : clinic)}
                        className="text-xs font-medium text-brand-700 hover:text-brand-800"
                      >
                        {editingClinic?.id === clinic.id ? 'Close' : 'Manage'}
                      </button>
                    </div>

                    {/* Expanded panel */}
                    {editingClinic?.id === clinic.id && (
                      <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                        {/* Portal Password */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Portal Password</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingClinic.portalPassword || ''}
                              onChange={(e) => setEditingClinic({ ...editingClinic, portalPassword: e.target.value })}
                              placeholder="Set a password for this clinic"
                              className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:bg-white font-mono"
                            />
                            <button
                              onClick={() => saveClinicPortalPassword(clinic.id, editingClinic.portalPassword || '')}
                              disabled={savingClinic}
                              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                              {savingClinic ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-gray-400">
                            Clinic staff will use this password on halolab.co.uk to submit prescriptions.
                          </p>
                        </div>

                        {/* Dentists */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-600">Dentists</label>
                            <button
                              onClick={() => setShowAddDentist(showAddDentist === clinic.id ? null : clinic.id)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              + Add Dentist
                            </button>
                          </div>

                          {/* Add dentist form */}
                          {showAddDentist === clinic.id && (
                            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                              <input
                                type="text"
                                value={newDentistName}
                                onChange={(e) => setNewDentistName(e.target.value)}
                                placeholder="Dentist name"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                              />
                              <input
                                type="email"
                                value={newDentistEmail}
                                onChange={(e) => setNewDentistEmail(e.target.value)}
                                placeholder="Email (optional)"
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => addDentistToClinic(clinic.id)}
                                  disabled={addingDentist || !newDentistName.trim()}
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {addingDentist ? 'Adding...' : 'Add'}
                                </button>
                                <button
                                  onClick={() => { setShowAddDentist(null); setNewDentistName(''); setNewDentistEmail('') }}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dentist list */}
                          {clinic.dentists && clinic.dentists.length > 0 ? (
                            <div className="space-y-2">
                              {clinic.dentists.map((d) => (
                                <div key={d.id} className="rounded-lg px-3 py-2 bg-white border border-gray-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-sm font-medium text-gray-900">{d.name}</span>
                                      {d.email && <span className="ml-2 text-xs text-gray-400">{d.email}</span>}
                                    </div>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${d.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                      {d.active ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={editingDentistPasswords[d.id] ?? d.portalPassword ?? ''}
                                      onChange={(e) => setEditingDentistPasswords((prev) => ({ ...prev, [d.id]: e.target.value }))}
                                      placeholder="Set dentist portal password"
                                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 focus:bg-white font-mono"
                                    />
                                    <button
                                      onClick={() => saveDentistPortalPassword(d.id)}
                                      disabled={savingDentistPassword === d.id}
                                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                                    >
                                      {savingDentistPassword === d.id ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                  {/* Notification Channel Preference */}
                                  <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                                    <label className="text-[11px] text-gray-500 flex-shrink-0">Notifications:</label>
                                    <div className="flex gap-1">
                                      {(['EMAIL', 'WHATSAPP', 'BOTH'] as const).map((ch) => (
                                        <button
                                          key={ch}
                                          onClick={() => saveDentistNotificationChannel(d.id, ch)}
                                          disabled={savingNotificationChannel === d.id}
                                          className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                                            (d.notificationChannel || 'EMAIL') === ch
                                              ? 'bg-gray-900 text-white'
                                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                          } ${savingNotificationChannel === d.id ? 'opacity-50' : ''}`}
                                        >
                                          {ch === 'EMAIL' ? 'Email' : ch === 'WHATSAPP' ? 'WhatsApp' : 'Both'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 py-2">No dentists added yet.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    )
  }

  function renderWorkflows() {
    if (loadingDept) return <LoadingPlaceholder />
    return (
      <SectionCard title="Department Workflows" description="Configure which statuses are available for each department. Click statuses to toggle them on/off.">
        <div className="space-y-5">
          {DEPARTMENTS.map((dept) => {
            const currentStatuses = editedWorkflows[dept] || []
            const config = deptConfigs.find((c) => c.department === dept)
            const originalStatuses = config ? (() => { try { return JSON.parse(config.statuses) } catch { return [] } })() : []
            const hasChanges = JSON.stringify(currentStatuses) !== JSON.stringify(originalStatuses)

            return (
              <div key={dept} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {DEPARTMENT_LABELS[dept]}
                  </h3>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <button onClick={() => saveWorkflowConfig(dept, currentStatuses)} disabled={savingWorkflows}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                        {savingWorkflows ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CASE_STATUSES.filter((st) => st !== 'CANCELLED').map((status) => {
                    const isActive = currentStatuses.includes(status)
                    const isRequired = status === 'NEW' || status === 'COMPLETED'
                    return (
                      <button key={status}
                        onClick={() => !isRequired && toggleWorkflowStatus(dept, status)}
                        disabled={isRequired}
                        className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                        } ${isRequired ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        title={isRequired ? 'This status is required' : `Click to ${isActive ? 'remove' : 'add'}`}
                      >
                        {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] || status}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  {currentStatuses.length} statuses active. Click to toggle. NEW and COMPLETED are required.
                </p>
              </div>
            )
          })}
        </div>
      </SectionCard>
    )
  }

  function renderEmailPreview() {
    const labName = s('lab_name') || 'Halo Lab'
    const labEmail = s('lab_email') || 'lab@halolab.co.uk'
    const labPhone = s('lab_phone') || '+44 20 1234 5678'
    const labAddress = s('lab_address') || '123 High Street, London'

    const sampleCase = {
      caseNumber: 'HL-2025-0042',
      patient: 'JD',
      department: 'Ceramics',
      dentist: 'Dr Sarah Smith',
      clinic: 'Smile Dental Clinic',
      dueDate: '15 Mar 2025',
      items: 'Zirconia Crown x2 (UR1, UL1) — Shade A2',
      notes: 'Please match adjacent teeth. Patient has high smile line.',
    }

    const clinicianEmailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1d1d1f; padding: 28px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: white; letter-spacing: -0.5px;">halo<span style="color: #3b82f6;">lab</span></h1>
          <p style="margin: 4px 0 0; font-size: 11px; color: #a1a1a6; letter-spacing: 2px; text-transform: uppercase;">Dental Laboratory</p>
        </div>
        <div style="padding: 32px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #166534;">New Case Received</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #15803d;">Your prescription has been submitted successfully.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; width: 120px;">Case Number</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; color: #1d1d1f; font-family: monospace;">${sampleCase.caseNumber}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Patient</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1d1d1f;">${sampleCase.patient}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Department</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1d1d1f;">${sampleCase.department}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Dentist</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1d1d1f;">${sampleCase.dentist}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Clinic</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1d1d1f;">${sampleCase.clinic}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Due Date</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1d1d1f;">${sampleCase.dueDate}</td></tr>
            <tr><td style="padding: 10px 0; font-size: 12px; color: #6b7280;">Items</td><td style="padding: 10px 0; font-size: 13px; color: #1d1d1f;">${sampleCase.items}</td></tr>
          </table>
          ${sampleCase.notes ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;"><p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Notes</p><p style="margin: 0; font-size: 13px; color: #78350f;">${sampleCase.notes}</p></div>` : ''}
          <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0;">We will keep you updated on the progress of this case. If you have any questions, please reply to this email or contact us directly.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #374151;">${labName}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">${labEmail} &middot; ${labPhone}</p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #9ca3af;">${labAddress}</p>
        </div>
      </div>`

    const referralEmailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1d1d1f; padding: 28px 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: white; letter-spacing: -0.5px;">halo<span style="color: #3b82f6;">lab</span></h1>
          <p style="margin: 4px 0 0; font-size: 11px; color: #a1a1a6; letter-spacing: 2px; text-transform: uppercase;">Dental Laboratory</p>
        </div>
        <div style="padding: 32px;">
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e40af;">New Outsource Order</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: #1d4ed8;">Please action the following outsource request.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280; width: 120px;">Case</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 600; color: #1d1d1f; font-family: monospace;">${sampleCase.caseNumber}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Patient Ref</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #1d1d1f;">${sampleCase.patient}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #6b7280;">Due Date</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; font-weight: 500; color: #dc2626;">${sampleCase.dueDate}</td></tr>
            <tr><td style="padding: 10px 0; font-size: 12px; color: #6b7280;">Items</td><td style="padding: 10px 0; font-size: 13px; color: #1d1d1f;">${sampleCase.items}</td></tr>
          </table>
          ${sampleCase.notes ? `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;"><p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Special Instructions</p><p style="margin: 0; font-size: 13px; color: #78350f;">${sampleCase.notes}</p></div>` : ''}
          <p style="font-size: 13px; color: #6b7280; margin: 24px 0 0;">Please confirm receipt and estimated delivery date. Contact us if you have any questions regarding this order.</p>
        </div>
        <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #374151;">${labName}</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">${labEmail} &middot; ${labPhone}</p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #9ca3af;">${labAddress}</p>
          <p style="margin: 8px 0 0; font-size: 10px; color: #d1d5db;">This is an automated message from ${labName}. Please do not reply directly.</p>
        </div>
      </div>`

    return (
      <div className="space-y-6">
        <SectionCard title="Email Previews" description="Preview the emails sent to clinicians (dentists) and referral centres when cases are submitted or outsourced.">
          <div className="space-y-4">
            <InfoBox title="About email previews">
              These previews show how emails will appear using your current branding settings (lab name, email, phone, address). Update your branding in the Branding section to see changes reflected here.
            </InfoBox>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => setPreviewEmail('clinician')}
                className={`group rounded-xl border-2 p-5 text-left transition-all ${
                  previewEmail === 'clinician' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Clinician Email</p>
                    <p className="text-xs text-gray-500">Sent to dentist on case creation</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Case confirmation with details, items, and notes sent when a prescription is submitted via the portal.</p>
              </button>

              <button
                onClick={() => setPreviewEmail('referral')}
                className={`group rounded-xl border-2 p-5 text-left transition-all ${
                  previewEmail === 'referral' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Referral Centre Email</p>
                    <p className="text-xs text-gray-500">Sent to outsource partners</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Outsource order notification with case details, items, due date, and special instructions.</p>
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Email Preview Panel */}
        {previewEmail && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {previewEmail === 'clinician' ? 'Clinician Email Preview' : 'Referral Centre Email Preview'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {previewEmail === 'clinician'
                    ? 'This email is sent to the dentist/clinic when a new case is created'
                    : 'This email is sent to referral centres when a case is outsourced'}
                </p>
              </div>
              <button onClick={() => setPreviewEmail(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Email header simulation */}
            <div className="border-b border-gray-100 px-6 py-3 bg-gray-50/50 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-500 w-12">From:</span>
                <span className="text-gray-700">{labName} &lt;{labEmail || 'noreply@halolab.co.uk'}&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-500 w-12">To:</span>
                <span className="text-gray-700">
                  {previewEmail === 'clinician' ? 'dr.smith@smileclinic.co.uk' : 'orders@premiumdental.co.uk'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-gray-500 w-12">Subject:</span>
                <span className="font-medium text-gray-900">
                  {previewEmail === 'clinician'
                    ? `Case Confirmation - ${sampleCase.caseNumber}`
                    : `Outsource Order - Case ${sampleCase.caseNumber}`}
                </span>
              </div>
            </div>

            {/* Email body */}
            <div className="p-6 bg-gray-100">
              <div
                className="mx-auto max-w-[600px] rounded-lg shadow-sm overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewEmail === 'clinician' ? clinicianEmailHtml : referralEmailHtml }}
              />
            </div>

            <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between bg-gray-50/30">
              <p className="text-[11px] text-gray-400">
                This is a sample preview using dummy data. Actual emails use real case data and your configured templates.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewEmail(previewEmail === 'clinician' ? 'referral' : 'clinician')}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  View {previewEmail === 'clinician' ? 'Referral' : 'Clinician'} Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderTemplates() {
    if (loadingTemplates) return <LoadingPlaceholder />
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
            <p className="mt-1 text-sm text-gray-500">Manage email templates used for automated communications.</p>
          </div>

          {templates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-gray-500">No templates configured yet.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {templates.map((template) => (
                    <tr key={template.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{template.name}</td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">{template.subject}</td>
                      <td className="px-6 py-3.5">
                        {template.category ? (
                          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">{template.category}</span>
                        ) : <span className="text-sm text-gray-400">&mdash;</span>}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${template.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {template.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button onClick={() => setEditingTemplate({ ...template })}
                          className="text-sm font-medium text-brand-700 hover:text-brand-800">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-100 px-6 py-4">
            <p className="text-xs text-gray-400">
              Templates support variables such as {'{{caseNumber}}'}, {'{{clinicName}}'}, {'{{dentistName}}'}, and more.
            </p>
          </div>
        </div>

        {/* Edit Template Modal */}
        {editingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Template: {editingTemplate.name}</h2>
                <button onClick={() => setEditingTemplate(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 space-y-5">
                <FieldGroup label="Subject Line">
                  <TextInput value={editingTemplate.subject} onChange={(v) => setEditingTemplate({ ...editingTemplate, subject: v })} placeholder="Email subject..." />
                </FieldGroup>
                <FieldGroup label="HTML Body" hint="Use {{variableName}} for dynamic content.">
                  <TextAreaInput value={editingTemplate.bodyHtml} onChange={(v) => setEditingTemplate({ ...editingTemplate, bodyHtml: v })} rows={10} />
                </FieldGroup>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Active</label>
                  <button onClick={() => setEditingTemplate({ ...editingTemplate, active: !editingTemplate.active })}
                    className={`relative h-6 w-11 rounded-full transition-colors ${editingTemplate.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editingTemplate.active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                <button onClick={() => setEditingTemplate(null)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={() => saveTemplate(editingTemplate)} disabled={savingTemplate}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderNotifications() {
    const TRIGGER_LABELS: Record<string, string> = {
      STATUS_CHANGE: 'Status Change',
      CASE_CREATED: 'Case Created',
      FILE_SHARED: 'File Shared',
      PRESCRIPTION_READY: 'Prescription Ready',
      REMAKE_FLAGGED: 'Remake Flagged',
    }
    const RECIPIENT_LABELS: Record<string, string> = {
      DENTIST: 'Dentist',
      CLINIC: 'Clinic',
      LAB: 'Lab Staff',
    }
    const CHANNEL_LABELS: Record<string, string> = {
      EMAIL: 'Email',
      WHATSAPP: 'WhatsApp',
      BOTH: 'Both',
    }

    return (
      <div className="space-y-6">
        <SectionCard title="Notification Automations" description="Configure automatic notifications triggered by system events. These rules determine when and how dentists, clinics, and lab staff are notified.">
          <div className="space-y-4">
            <InfoBox title="How notification rules work">
              Each rule defines a trigger event (e.g. case created, status change), who receives the notification (dentist, clinic, or lab staff), and the channel (email, WhatsApp, or both). Rules can be enabled or disabled individually.
            </InfoBox>

            {loadingNotificationRules ? (
              <LoadingPlaceholder />
            ) : (
              <>
                {/* Existing rules */}
                {notificationRules.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-gray-500">No notification rules configured yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Add your first rule to start sending automatic notifications.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notificationRules.map((rule) => (
                      <div key={rule.id} className={`rounded-xl border px-4 py-3 transition-all ${rule.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleNotificationRule(rule.id, !rule.active)}
                              className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${rule.active ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${rule.active ? 'left-[18px]' : 'left-0.5'}`} />
                            </button>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                              <p className="text-[11px] text-gray-400">
                                Trigger: <span className="font-medium text-gray-600">{TRIGGER_LABELS[rule.trigger] || rule.trigger}</span>
                                {rule.triggerValue && <span> ({rule.triggerValue})</span>}
                                {' '}&middot;{' '}
                                Recipient: <span className="font-medium text-gray-600">{RECIPIENT_LABELS[rule.recipient] || rule.recipient}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={rule.channel}
                              onChange={(e) => updateNotificationRuleChannel(rule.id, e.target.value)}
                              className="rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1 text-xs text-gray-700 outline-none focus:border-gray-400"
                            >
                              <option value="EMAIL">Email</option>
                              <option value="WHATSAPP">WhatsApp</option>
                              <option value="BOTH">Both</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new rule */}
                {addingRule ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">New Notification Rule</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Rule Name</label>
                        <input
                          type="text"
                          value={newRule.name}
                          onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                          placeholder="e.g. Notify dentist on case ready"
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Trigger</label>
                        <select
                          value={newRule.trigger}
                          onChange={(e) => setNewRule({ ...newRule, trigger: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                        >
                          {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      {newRule.trigger === 'STATUS_CHANGE' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Status Value (optional)</label>
                          <select
                            value={newRule.triggerValue}
                            onChange={(e) => setNewRule({ ...newRule, triggerValue: e.target.value })}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                          >
                            <option value="">Any status change</option>
                            {CASE_STATUSES.map((st) => (
                              <option key={st} value={st}>{CASE_STATUS_LABELS[st as keyof typeof CASE_STATUS_LABELS] || st}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Recipient</label>
                        <select
                          value={newRule.recipient}
                          onChange={(e) => setNewRule({ ...newRule, recipient: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                        >
                          {Object.entries(RECIPIENT_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
                        <select
                          value={newRule.channel}
                          onChange={(e) => setNewRule({ ...newRule, channel: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                        >
                          <option value="EMAIL">Email</option>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="BOTH">Both</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={createNotificationRule}
                        disabled={savingRule || !newRule.name.trim()}
                        className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {savingRule ? 'Creating...' : 'Create Rule'}
                      </button>
                      <button
                        onClick={() => { setAddingRule(false); setNewRule({ name: '', trigger: 'CASE_CREATED', triggerValue: '', channel: 'EMAIL', recipient: 'DENTIST' }) }}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingRule(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-500 transition-all hover:border-gray-400 hover:text-gray-700 w-full justify-center"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Notification Rule
                  </button>
                )}
              </>
            )}
          </div>
        </SectionCard>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const sectionRenderers: Record<SectionKey, () => React.ReactNode> = {
    general: renderGeneral, billing: renderBilling, branding: renderBranding,
    clinics: renderClinics, integrations: renderIntegrations, workflows: renderWorkflows, templates: renderTemplates,
    'email-preview': renderEmailPreview, notifications: renderNotifications,
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your lab configuration, billing, branding and integrations.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <nav className="sticky top-6 space-y-1">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.key
              return (
                <button key={section.key} onClick={() => setActiveSection(section.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all ${isActive ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>{section.icon}</span>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{section.label}</span>
                    <span className={`block truncate text-xs leading-tight ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>{section.description}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
        <div className="lg:col-span-3">{sectionRenderers[activeSection]()}</div>
      </div>
    </div>
  )
}

function LoadingPlaceholder() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-24 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center">
        <svg className="h-6 w-6 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <p className="mt-3 text-sm text-gray-500">Loading settings...</p>
    </div>
  )
}
