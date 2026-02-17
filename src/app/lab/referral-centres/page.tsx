'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface ReferralCentre {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  defaultLeadTimeDays: number
  specialties: string | null
  billingTerms: string | null
  notes: string | null
  rating: number | null
  active: boolean
  _count?: { outsourceOrders: number }
}

interface PricingItem {
  id: string
  itemName: string
  itemCategory: string | null
  costPerUnit: number
  currency: string
  notes: string | null
}

interface CompareResult {
  centreId: string
  centreName: string
  centreRating: number | null
  itemName: string
  itemCategory: string | null
  costPerUnit: number
  currency: string
  notes: string | null
}

type ViewMode = 'list' | 'compare'

export default function ReferralCentresPage() {
  const [centres, setCentres] = useState<ReferralCentre[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCentre, setEditingCentre] = useState<ReferralCentre | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formLeadTime, setFormLeadTime] = useState(5)
  const [formSpecialties, setFormSpecialties] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Pricing state
  const [selectedCentre, setSelectedCentre] = useState<ReferralCentre | null>(null)
  const [pricing, setPricing] = useState<PricingItem[]>([])
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [pricingForm, setPricingForm] = useState({ itemName: '', itemCategory: '', costPerUnit: '', notes: '' })
  const [editingPricing, setEditingPricing] = useState<PricingItem | null>(null)
  const [savingPricing, setSavingPricing] = useState(false)

  // Compare state
  const [compareSearch, setCompareSearch] = useState('')
  const [compareResults, setCompareResults] = useState<CompareResult[]>([])
  const [loadingCompare, setLoadingCompare] = useState(false)

  useEffect(() => { fetchCentres() }, [])

  async function fetchCentres() {
    setLoading(true)
    try {
      const res = await fetch('/api/referral-centres')
      if (res.ok) { const data = await res.json(); setCentres(data.data || []) }
    } catch { toast.error('Failed to load referral centres') }
    finally { setLoading(false) }
  }

  async function fetchPricing(centreId: string) {
    setLoadingPricing(true)
    try {
      const res = await fetch(`/api/referral-centres/${centreId}/pricing`)
      if (res.ok) { const data = await res.json(); setPricing(data.data || []) }
    } catch { toast.error('Failed to load pricing') }
    finally { setLoadingPricing(false) }
  }

  async function fetchCompare(item: string) {
    if (!item.trim()) return
    setLoadingCompare(true)
    try {
      const res = await fetch(`/api/referral-centres/compare?item=${encodeURIComponent(item)}`)
      if (res.ok) { const data = await res.json(); setCompareResults(data.data || []) }
    } catch { toast.error('Failed to compare prices') }
    finally { setLoadingCompare(false) }
  }

  function openAddModal() {
    setEditingCentre(null)
    setFormName(''); setFormEmail(''); setFormPhone(''); setFormAddress('')
    setFormLeadTime(5); setFormSpecialties(''); setFormNotes('')
    setShowModal(true)
  }

  function openEditModal(centre: ReferralCentre) {
    setEditingCentre(centre)
    setFormName(centre.name); setFormEmail(centre.email || ''); setFormPhone(centre.phone || '')
    setFormAddress(centre.address || ''); setFormLeadTime(centre.defaultLeadTimeDays)
    const specs = centre.specialties ? JSON.parse(centre.specialties) : []
    setFormSpecialties(Array.isArray(specs) ? specs.join(', ') : '')
    setFormNotes(centre.notes || '')
    setShowModal(true)
  }

  function openPricingPanel(centre: ReferralCentre) {
    setSelectedCentre(centre)
    fetchPricing(centre.id)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const specialtiesArray = formSpecialties.split(',').map((s) => s.trim()).filter(Boolean)
    const payload = {
      name: formName, email: formEmail || undefined, phone: formPhone || undefined,
      address: formAddress || undefined, defaultLeadTimeDays: formLeadTime,
      specialties: specialtiesArray.length > 0 ? JSON.stringify(specialtiesArray) : undefined,
      notes: formNotes || undefined,
    }
    try {
      const url = editingCentre ? `/api/referral-centres/${editingCentre.id}` : '/api/referral-centres'
      const method = editingCentre ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { setShowModal(false); toast.success(editingCentre ? 'Centre updated' : 'Centre added'); fetchCentres() }
      else { const data = await res.json(); toast.error(data.error || 'Failed to save') }
    } catch { toast.error('Failed to save referral centre') }
    finally { setSaving(false) }
  }

  async function updateRating(centreId: string, rating: number) {
    try {
      const res = await fetch(`/api/referral-centres/${centreId}/rating`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating }),
      })
      if (res.ok) {
        setCentres((prev) => prev.map((c) => c.id === centreId ? { ...c, rating } : c))
        toast.success('Rating updated')
      }
    } catch { toast.error('Failed to update rating') }
  }

  async function handleSavePricing(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCentre) return
    setSavingPricing(true)
    try {
      const body: Record<string, unknown> = {
        itemName: pricingForm.itemName,
        itemCategory: pricingForm.itemCategory || undefined,
        costPerUnit: parseFloat(pricingForm.costPerUnit),
        notes: pricingForm.notes || undefined,
      }
      if (editingPricing) body.pricingId = editingPricing.id
      const res = await fetch(`/api/referral-centres/${selectedCentre.id}/pricing`, {
        method: editingPricing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        setShowPricingModal(false); setEditingPricing(null)
        setPricingForm({ itemName: '', itemCategory: '', costPerUnit: '', notes: '' })
        fetchPricing(selectedCentre.id)
        toast.success(editingPricing ? 'Price updated' : 'Price added')
      } else { const data = await res.json(); toast.error(data.error || 'Failed to save') }
    } catch { toast.error('Failed to save pricing') }
    finally { setSavingPricing(false) }
  }

  async function deletePricing(pricingId: string) {
    if (!selectedCentre) return
    try {
      const res = await fetch(`/api/referral-centres/${selectedCentre.id}/pricing`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pricingId }),
      })
      if (res.ok) { fetchPricing(selectedCentre.id); toast.success('Price removed') }
    } catch { toast.error('Failed to delete pricing') }
  }

  function parseSpecialties(json: string | null): string[] {
    if (!json) return []
    try { const parsed = JSON.parse(json); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
  }

  const filtered = centres.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass = 'w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-[13px] placeholder-gray-400 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 transition-all duration-200'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Referral Centres</h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage outsourcing partners, pricing and ratings</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-200 p-0.5">
            <button onClick={() => setViewMode('list')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Centres</button>
            <button onClick={() => setViewMode('compare')} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'compare' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>Compare Prices</button>
          </div>
          {viewMode === 'list' && (
            <button onClick={openAddModal} className="rounded-xl bg-gray-900 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 transition-all shadow-sm">Add Centre</button>
          )}
        </div>
      </div>

      {viewMode === 'compare' ? (
        /* ---- Compare View ---- */
        <div>
          <div className="mb-4 flex gap-2">
            <input type="text" placeholder="Search item (e.g. Porcelain Veneer, Zirconia Crown...)" value={compareSearch}
              onChange={(e) => setCompareSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCompare(compareSearch)}
              className="w-full max-w-lg rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            <button onClick={() => fetchCompare(compareSearch)} disabled={loadingCompare || !compareSearch.trim()}
              className="rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all">
              {loadingCompare ? 'Searching...' : 'Compare'}
            </button>
          </div>

          {compareResults.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Price Comparison: {compareResults[0]?.itemName}</h2>
                <p className="text-xs text-gray-400">{compareResults.length} centres offering this item, sorted cheapest first</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Rank</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Centre</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Rating</th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cost/Unit</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {compareResults.map((r, idx) => (
                    <tr key={r.centreId} className={`hover:bg-gray-50/50 ${idx === 0 ? 'bg-green-50/30' : ''}`}>
                      <td className="px-6 py-3">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{idx + 1}</span>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{r.centreName}</td>
                      <td className="px-6 py-3">
                        {r.centreRating != null ? (
                          <span className="inline-flex items-center gap-1 text-sm">
                            <span className="font-semibold text-gray-900">{r.centreRating.toFixed(1)}</span>
                            <span className="text-yellow-500">/10</span>
                          </span>
                        ) : <span className="text-xs text-gray-400">Not rated</span>}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-sm font-bold ${idx === 0 ? 'text-green-700' : 'text-gray-900'}`}>
                          {formatCurrency(r.costPerUnit)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">{r.notes || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loadingCompare && compareSearch && (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
              <p className="text-sm text-gray-500">No results. Try searching for an item name like "Porcelain Veneer" or "Zirconia Crown".</p>
            </div>
          )}
        </div>
      ) : (
        /* ---- List View ---- */
        <div className="flex gap-6">
          <div className={`flex-1 ${selectedCentre ? 'max-w-[60%]' : ''}`}>
            <div className="mb-4">
              <input type="text" placeholder="Search centres..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Centre</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Specialties</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Rating</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Lead</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <p className="text-sm text-gray-400">No referral centres found</p>
                          <button onClick={openAddModal} className="mt-2 text-sm font-semibold text-gray-900 hover:underline">Add your first centre</button>
                        </td>
                      </tr>
                    ) : filtered.map((centre) => {
                      const specs = parseSpecialties(centre.specialties)
                      const isSelected = selectedCentre?.id === centre.id
                      return (
                        <tr key={centre.id} className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/30 border-l-2 border-l-blue-500' : ''}`}
                          onClick={() => openPricingPanel(centre)}>
                          <td className="px-5 py-3">
                            <div className="text-sm font-semibold text-gray-900">{centre.name}</div>
                            {centre.email && <div className="text-[11px] text-gray-400">{centre.email}</div>}
                          </td>
                          <td className="px-5 py-3">
                            {specs.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {specs.slice(0, 3).map((s) => (
                                  <span key={s} className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{s}</span>
                                ))}
                                {specs.length > 3 && <span className="text-[10px] text-gray-400">+{specs.length - 3}</span>}
                              </div>
                            ) : <span className="text-xs text-gray-300">\u2014</span>}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {centre.rating != null ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="text-sm font-bold text-gray-900">{centre.rating.toFixed(1)}</span>
                                <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              </span>
                            ) : <span className="text-xs text-gray-300">\u2014</span>}
                          </td>
                          <td className="px-5 py-3 text-center text-sm font-medium text-gray-700">{centre.defaultLeadTimeDays}d</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold ${centre.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {centre.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEditModal(centre)} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-100">Edit</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pricing Side Panel */}
          {selectedCentre && (
            <div className="w-[40%] min-w-[340px]">
              <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{selectedCentre.name}</h3>
                      <p className="text-[11px] text-gray-400">Pricing &amp; Rating</p>
                    </div>
                    <button onClick={() => setSelectedCentre(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* Rating */}
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rating (out of 10)</label>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button key={n} onClick={() => updateRating(selectedCentre.id, n)}
                          className={`h-7 w-7 rounded-lg text-[11px] font-bold transition-all ${
                            selectedCentre.rating != null && n <= selectedCentre.rating
                              ? 'bg-yellow-400 text-yellow-900'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pricing list */}
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Item Prices</h4>
                    <button onClick={() => {
                      setEditingPricing(null)
                      setPricingForm({ itemName: '', itemCategory: '', costPerUnit: '', notes: '' })
                      setShowPricingModal(true)
                    }} className="text-[11px] font-semibold text-brand-700 hover:text-brand-800">+ Add Price</button>
                  </div>

                  {loadingPricing ? (
                    <p className="py-6 text-center text-xs text-gray-400">Loading...</p>
                  ) : pricing.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-xs text-gray-400">No prices set for this centre.</p>
                      <button onClick={() => { setEditingPricing(null); setPricingForm({ itemName: '', itemCategory: '', costPerUnit: '', notes: '' }); setShowPricingModal(true) }}
                        className="mt-1 text-xs font-semibold text-brand-700">Add first price</button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {pricing.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 hover:border-gray-200 transition-colors">
                          <div>
                            <p className="text-[13px] font-semibold text-gray-900">{p.itemName}</p>
                            {p.itemCategory && <p className="text-[10px] text-gray-400">{p.itemCategory}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(p.costPerUnit)}</span>
                            <button onClick={() => {
                              setEditingPricing(p)
                              setPricingForm({ itemName: p.itemName, itemCategory: p.itemCategory || '', costPerUnit: String(p.costPerUnit), notes: p.notes || '' })
                              setShowPricingModal(true)
                            }} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                            </button>
                            <button onClick={() => deletePricing(p.id)} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Centre Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200/60">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">{editingCentre ? 'Edit Referral Centre' : 'Add Referral Centre'}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Email</label><input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className={inputClass} /></div>
                  <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Phone</label><input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className={inputClass} /></div>
                </div>
                <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Address</label><textarea value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className={inputClass} rows={2} /></div>
                <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Default Lead Time (days)</label><input type="number" value={formLeadTime} onChange={(e) => setFormLeadTime(parseInt(e.target.value) || 5)} min={1} className={inputClass} /></div>
                <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Specialties</label><input type="text" value={formSpecialties} onChange={(e) => setFormSpecialties(e.target.value)} placeholder="Comma-separated (e.g. Ceramics, Implants)" className={inputClass} /></div>
                <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Notes</label><textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className={inputClass} rows={2} /></div>
              </div>
              <div className="mt-6 flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50 shadow-sm">{saving ? 'Saving...' : editingCentre ? 'Update' : 'Add Centre'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">{editingPricing ? 'Edit Price' : 'Add Item Price'}</h2>
              <button onClick={() => setShowPricingModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSavePricing} className="p-6 space-y-4">
              <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Item Name <span className="text-red-500">*</span></label>
                <input type="text" value={pricingForm.itemName} onChange={(e) => setPricingForm({ ...pricingForm, itemName: e.target.value })} placeholder="e.g. Porcelain Veneer" className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Category</label>
                  <select value={pricingForm.itemCategory} onChange={(e) => setPricingForm({ ...pricingForm, itemCategory: e.target.value })} className={inputClass}>
                    <option value="">Select...</option><option value="Ceramics">Ceramics</option><option value="Appliances">Appliances</option><option value="DSD">DSD</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Cost Per Unit (&pound;) <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0" value={pricingForm.costPerUnit} onChange={(e) => setPricingForm({ ...pricingForm, costPerUnit: e.target.value })} placeholder="0.00" className={inputClass} required />
                </div>
              </div>
              <div><label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Notes</label>
                <input type="text" value={pricingForm.notes} onChange={(e) => setPricingForm({ ...pricingForm, notes: e.target.value })} placeholder="Optional notes" className={inputClass} />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setShowPricingModal(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={savingPricing} className="rounded-xl bg-gray-900 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50">{savingPricing ? 'Saving...' : editingPricing ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
