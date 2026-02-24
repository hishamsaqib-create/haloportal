'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PricingVariation {
  name: string
  ruleCount: number
}

interface DentistSettingsProps {
  dentist: {
    id: string
    name: string
    portalPassword: string | null
    allowCeramics: boolean
    allowDsd: boolean
    allowAppliances: boolean
    pricingVariationId: string | null
  }
  pricingVariations: PricingVariation[]
}

export function DentistSettings({ dentist, pricingVariations }: DentistSettingsProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [portalPassword, setPortalPassword] = useState(dentist.portalPassword || '')
  const [allowCeramics, setAllowCeramics] = useState(dentist.allowCeramics)
  const [allowDsd, setAllowDsd] = useState(dentist.allowDsd)
  const [allowAppliances, setAllowAppliances] = useState(dentist.allowAppliances)
  const [pricingVariationId, setPricingVariationId] = useState(dentist.pricingVariationId || '')

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch(`/api/dentists/${dentist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalPassword: portalPassword || null,
          allowCeramics,
          allowDsd,
          allowAppliances,
          pricingVariationId: pricingVariationId || null,
        }),
      })
      if (res.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save settings')
      }
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Portal Access */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Portal Access</h3>
          <p className="text-xs text-gray-500 mt-0.5">Set a password for this dentist to access the submission page</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submission Password</label>
            <input
              type="text"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
              placeholder="Set a password for this dentist..."
              className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              The dentist will use this password to log in at the submission page and submit cases.
            </p>
          </div>
        </div>
      </div>

      {/* Department Access */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Department Access</h3>
          <p className="text-xs text-gray-500 mt-0.5">Activate or deactivate departments this dentist can submit cases to</p>
        </div>
        <div className="px-6 py-5 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-medium text-gray-900">Ceramics</span>
                <p className="text-xs text-gray-500">Crowns, veneers, bridges & implants</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${allowCeramics ? 'text-green-600' : 'text-gray-400'}`}>
                {allowCeramics ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={() => setAllowCeramics(!allowCeramics)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  allowCeramics ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  allowCeramics ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-medium text-gray-900">Digital Smile Design</span>
                <p className="text-xs text-gray-500">DSD, smile design & wax-ups</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${allowDsd ? 'text-green-600' : 'text-gray-400'}`}>
                {allowDsd ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={() => setAllowDsd(!allowDsd)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  allowDsd ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  allowDsd ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-sm font-medium text-gray-900">Appliances</span>
                <p className="text-xs text-gray-500">Retainers, guards & orthodontics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium ${allowAppliances ? 'text-green-600' : 'text-gray-400'}`}>
                {allowAppliances ? 'Active' : 'Inactive'}
              </span>
              <button
                type="button"
                onClick={() => setAllowAppliances(!allowAppliances)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  allowAppliances ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  allowAppliances ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </label>
        </div>
      </div>

      {/* Pricing Variation */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Pricing Variation</h3>
          <p className="text-xs text-gray-500 mt-0.5">Assign a pricing variation to override base product prices for this dentist</p>
        </div>
        <div className="px-6 py-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Variation</label>
            <select
              value={pricingVariationId}
              onChange={(e) => setPricingVariationId(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">None (use base prices)</option>
              {pricingVariations.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.ruleCount} rule{v.ruleCount !== 1 ? 's' : ''})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Pricing variations are managed in Products &amp; Pricing. Assigning a variation applies its price overrides when calculating case prices.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium animate-fade-in">Settings saved</span>
        )}
        {error && (
          <span className="text-sm text-red-600 font-medium">{error}</span>
        )}
      </div>
    </div>
  )
}
