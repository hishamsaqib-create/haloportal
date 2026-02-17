'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEPARTMENTS, DEPARTMENT_LABELS, CASE_STATUSES, CASE_STATUS_LABELS } from '@/lib/constants'
import toast from 'react-hot-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionKey = 'general' | 'billing' | 'branding' | 'integrations' | 'workflows' | 'templates'

interface SettingEntry {
  key: string
  value: string
  label: string
  category: string
}

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTIONS: { key: SectionKey; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: 'general',
    label: 'General',
    description: 'Lab identity and numbering formats',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.333.183-.582.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'Tax rates, payment terms and currency',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    key: 'branding',
    label: 'Branding',
    description: 'Appearance, colors and contact details',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
      </svg>
    ),
  },
  {
    key: 'integrations',
    label: 'Integrations',
    description: 'WhatsApp API and third-party services',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
  {
    key: 'workflows',
    label: 'Dept. Workflows',
    description: 'Department status configurations',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
    ),
  },
  {
    key: 'templates',
    label: 'Email Templates',
    description: 'Automated email configurations',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
]

const ACCENT_SWATCHES = [
  '#0071e3', // Apple blue
  '#34c759', // Green
  '#ff9500', // Orange
  '#ff3b30', // Red
  '#af52de', // Purple
  '#ff2d55', // Pink
  '#5856d6', // Indigo
  '#00c7be', // Teal
  '#1d1d1f', // Black
  '#6e6e73', // Gray
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

function SectionCard({
  title,
  description,
  children,
  onSave,
  saving,
}: {
  title: string
  description: string
  children: React.ReactNode
  onSave?: () => void
  saving?: boolean
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
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  mono?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-0 ${mono ? 'font-mono' : ''}`}
    />
  )
}

function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-0 resize-none"
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-400 focus:bg-white focus:ring-0 appearance-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionKey>('general')

  // Settings state (keyed by setting key)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Department workflow state
  const [deptConfigs, setDeptConfigs] = useState<DeptStatusConfig[]>([])
  const [loadingDept, setLoadingDept] = useState(true)

  // Email templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Saving states per section
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [savingBranding, setSavingBranding] = useState(false)
  const [savingIntegrations, setSavingIntegrations] = useState(false)

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const loadAllSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const json = await res.json()
      const data: Record<string, SettingEntry> = json.data || {}
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
      setDeptConfigs(json.data || [])
    } catch {
      toast.error('Failed to load department configurations')
    } finally {
      setLoadingDept(false)
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

  useEffect(() => {
    loadAllSettings()
    loadDeptConfigs()
    loadTemplates()
  }, [loadAllSettings, loadDeptConfigs, loadTemplates])

  // -----------------------------------------------------------------------
  // Setting helpers
  // -----------------------------------------------------------------------

  function s(key: string): string {
    return settings[key] ?? ''
  }

  function setS(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function saveSettings(keys: string[], setFn: (v: boolean) => void) {
    setFn(true)
    try {
      const payload: Record<string, string> = {}
      for (const key of keys) {
        payload[key] = s(key)
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Failed to save settings')
      }
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setFn(false)
    }
  }

  // -----------------------------------------------------------------------
  // Section renderers
  // -----------------------------------------------------------------------

  function renderGeneral() {
    if (loadingSettings) return <LoadingPlaceholder />
    return (
      <SectionCard
        title="General Settings"
        description="Configure your lab name and document numbering formats."
        onSave={() => saveSettings(['lab_name', 'case_number_format', 'invoice_number_format'], setSavingGeneral)}
        saving={savingGeneral}
      >
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
      <SectionCard
        title="Billing Settings"
        description="Configure tax rates, payment terms and default currency for invoices."
        onSave={() => saveSettings(['vat_rate', 'payment_terms_days', 'currency'], setSavingBilling)}
        saving={savingBilling}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <FieldGroup label="VAT Rate (%)" hint="Applied to all new invoices by default.">
              <TextInput
                type="number"
                value={s('vat_rate')}
                onChange={(v) => setS('vat_rate', v)}
                placeholder="20"
              />
            </FieldGroup>
            <FieldGroup label="Payment Terms (days)" hint="Default number of days until invoice is due.">
              <TextInput
                type="number"
                value={s('payment_terms_days')}
                onChange={(v) => setS('payment_terms_days', v)}
                placeholder="30"
              />
            </FieldGroup>
            <FieldGroup label="Currency" hint="Default currency for new invoices.">
              <SelectInput
                value={s('currency') || 'GBP'}
                onChange={(v) => setS('currency', v)}
                options={CURRENCY_OPTIONS}
              />
            </FieldGroup>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200/70">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">About billing defaults</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  These values are used as defaults when creating new invoices. Individual invoices can override these values. Changes here will not affect existing invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    )
  }

  function renderBranding() {
    if (loadingSettings) return <LoadingPlaceholder />
    const currentAccent = s('theme_accent_color') || '#0071e3'
    return (
      <SectionCard
        title="Branding"
        description="Customise the portal appearance and set your lab contact details."
        onSave={() =>
          saveSettings(
            ['lab_name', 'lab_email', 'lab_phone', 'lab_address', 'theme_accent_color'],
            setSavingBranding,
          )
        }
        saving={savingBranding}
      >
        <div className="space-y-6">
          {/* Accent colour */}
          <FieldGroup label="Accent Color" hint="Used for buttons, links and active elements across the portal.">
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setS('theme_accent_color', color)}
                  className={`relative h-8 w-8 rounded-full border-2 transition-all ${
                    currentAccent === color
                      ? 'border-gray-900 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {currentAccent === color && (
                    <svg className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                <label className="text-xs text-gray-500">Custom:</label>
                <input
                  type="color"
                  value={currentAccent}
                  onChange={(e) => setS('theme_accent_color', e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded-lg border border-gray-200 p-0.5"
                />
                <input
                  type="text"
                  value={currentAccent}
                  onChange={(e) => setS('theme_accent_color', e.target.value)}
                  className="w-24 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-1.5 font-mono text-xs text-gray-700 outline-none focus:border-gray-400 focus:bg-white"
                  placeholder="#0071e3"
                />
              </div>
            </div>
            {/* Preview */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl" style={{ backgroundColor: currentAccent }} />
              <div>
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <p className="font-mono text-xs text-gray-400">{currentAccent}</p>
              </div>
            </div>
          </FieldGroup>

          <hr className="border-gray-100" />

          {/* Contact details */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldGroup label="Lab Name">
                <TextInput value={s('lab_name')} onChange={(v) => setS('lab_name', v)} placeholder="Halo Dental Lab" />
              </FieldGroup>
              <FieldGroup label="Email Address">
                <TextInput value={s('lab_email')} onChange={(v) => setS('lab_email', v)} placeholder="lab@halolab.co.uk" type="email" />
              </FieldGroup>
            </div>
            <FieldGroup label="Phone Number">
              <TextInput value={s('lab_phone')} onChange={(v) => setS('lab_phone', v)} placeholder="+44 20 1234 5678" />
            </FieldGroup>
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
      <SectionCard
        title="Integrations"
        description="Configure connections to third-party services."
        onSave={() =>
          saveSettings(
            ['whatsapp_phone_id', 'whatsapp_access_token', 'whatsapp_verify_token', 'whatsapp_business_id'],
            setSavingIntegrations,
          )
        }
        saving={savingIntegrations}
      >
        <div className="space-y-6">
          {/* WhatsApp header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">WhatsApp Business API</h3>
              <p className="text-xs text-gray-500">Connect your WhatsApp Business account for automated messaging.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldGroup label="Phone Number ID" hint="Found in your Meta Business Suite app dashboard.">
                <TextInput
                  value={s('whatsapp_phone_id')}
                  onChange={(v) => setS('whatsapp_phone_id', v)}
                  placeholder="e.g. 123456789012345"
                  mono
                />
              </FieldGroup>
              <FieldGroup label="Business Account ID" hint="Your WhatsApp Business Account ID from Meta.">
                <TextInput
                  value={s('whatsapp_business_id')}
                  onChange={(v) => setS('whatsapp_business_id', v)}
                  placeholder="e.g. 123456789012345"
                  mono
                />
              </FieldGroup>
            </div>
            <FieldGroup label="Access Token" hint="Permanent access token generated from your Meta app.">
              <TextInput
                value={s('whatsapp_access_token')}
                onChange={(v) => setS('whatsapp_access_token', v)}
                placeholder="EAABsbCS..."
                mono
              />
            </FieldGroup>
            <FieldGroup label="Webhook Verify Token" hint="A custom string you set when configuring the webhook in Meta.">
              <TextInput
                value={s('whatsapp_verify_token')}
                onChange={(v) => setS('whatsapp_verify_token', v)}
                placeholder="your-verify-token"
                mono
              />
            </FieldGroup>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Security notice</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  Access tokens are stored securely in the database. Avoid sharing these values. Rotate your tokens regularly for best security practices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    )
  }

  function renderWorkflows() {
    if (loadingDept) return <LoadingPlaceholder />
    return (
      <SectionCard
        title="Department Workflows"
        description="View the status workflow configuration for each department. Statuses determine the order of case progression."
      >
        <div className="space-y-4">
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
              <div key={dept} className="rounded-xl border border-gray-200 p-4 transition-colors hover:border-gray-300">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {DEPARTMENT_LABELS[dept]}
                  </h3>
                  {config && (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        config.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {config.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
                {statuses.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {statuses.map((status, idx) => (
                      <div key={status} className="flex items-center">
                        {idx > 0 && (
                          <svg className="mx-1 h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] || status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CASE_STATUSES.map((status, idx) => (
                      <div key={status} className="flex items-center">
                        {idx > 0 && (
                          <svg className="mx-1 h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <span className="inline-flex rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {CASE_STATUS_LABELS[status] || status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2.5 text-xs text-gray-400">
                  {config
                    ? 'Custom configuration active'
                    : 'Using default status workflow.'}
                </p>
              </div>
            )
          })}
        </div>
      </SectionCard>
    )
  }

  function renderTemplates() {
    if (loadingTemplates) return <LoadingPlaceholder />
    return (
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage email templates used for automated communications.
          </p>
        </div>

        {templates.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-700">No templates configured</p>
            <p className="mt-1 text-xs text-gray-400">Email templates can be added via the API.</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {templates.map((template) => (
                  <tr key={template.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">{template.name}</td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">{template.subject}</td>
                    <td className="px-6 py-3.5">
                      {template.category ? (
                        <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {template.category}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          template.active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
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

        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-400">
            Templates support variables such as {'{{caseNumber}}'}, {'{{clinicName}}'}, {'{{dentistName}}'}, and more.
          </p>
        </div>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const sectionRenderers: Record<SectionKey, () => React.ReactNode> = {
    general: renderGeneral,
    billing: renderBilling,
    branding: renderBranding,
    integrations: renderIntegrations,
    workflows: renderWorkflows,
    templates: renderTemplates,
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your lab configuration, billing, branding and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Sidebar navigation */}
        <div className="lg:col-span-1">
          <nav className="sticky top-6 space-y-1">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.key
              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {section.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{section.label}</span>
                    <span className={`block truncate text-xs leading-tight ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                      {section.description}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="lg:col-span-3">
          {sectionRenderers[activeSection]()}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared loading state
// ---------------------------------------------------------------------------

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
