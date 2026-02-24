'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/constants'

interface Product {
  id: string
  department: string
  name: string
  sku: string | null
  description: string | null
  basePrice: number
  requiresToothCount: boolean
  requiresToothSelection: boolean
  active: boolean
  pricingRules: {
    id: string
    price: number
    clinic: { id: string; name: string } | null
    dentist: { id: string; name: string } | null
  }[]
}

interface PricingRule {
  id: string
  productId: string
  variationName: string | null
  price: number
  minTeeth: number | null
  additionalToothPrice: number | null
  product: { id: string; name: string; sku: string | null; department: string; basePrice: number }
  clinic: { id: string; name: string } | null
  dentist: { id: string; name: string } | null
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'pricing'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pricing tab state
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingEdits, setPricingEdits] = useState<Record<string, { price: number; minTeeth?: number | null; additionalToothPrice?: number | null }>>({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formSku, setFormSku] = useState('')
  const [formDept, setFormDept] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formBasePrice, setFormBasePrice] = useState(0)
  const [formToothCount, setFormToothCount] = useState(false)
  const [formToothSelection, setFormToothSelection] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [filterDept])

  const fetchPricingRules = useCallback(async () => {
    setPricingLoading(true)
    try {
      const res = await fetch('/api/pricing-rules?limit=100')
      if (res.ok) {
        const data = await res.json()
        setPricingRules(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setPricingLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'pricing') {
      fetchPricingRules()
    }
  }, [activeTab, fetchPricingRules])

  function handlePriceEdit(ruleId: string, field: string, value: number | null) {
    setPricingEdits((prev) => ({
      ...prev,
      [ruleId]: {
        ...prev[ruleId],
        price: prev[ruleId]?.price ?? pricingRules.find((r) => r.id === ruleId)?.price ?? 0,
        [field]: value,
      },
    }))
  }

  async function handleBulkSave() {
    const editEntries = Object.entries(pricingEdits)
    if (editEntries.length === 0) return

    setBulkSaving(true)
    try {
      const updates = editEntries.map(([id, edit]) => ({
        id,
        price: edit.price,
        minTeeth: edit.minTeeth,
        additionalToothPrice: edit.additionalToothPrice,
      }))

      const res = await fetch('/api/pricing-rules/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      if (res.ok) {
        setPricingEdits({})
        fetchPricingRules()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save pricing changes')
      }
    } catch {
      alert('Failed to save pricing changes')
    } finally {
      setBulkSaving(false)
    }
  }

  async function handleDuplicate(sourceId: string) {
    if (!duplicateName.trim()) return
    try {
      const res = await fetch('/api/pricing-rules/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, variationName: duplicateName.trim() }),
      })
      if (res.ok) {
        setDuplicatingId(null)
        setDuplicateName('')
        fetchPricingRules()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to duplicate pricing rule')
      }
    } catch {
      alert('Failed to duplicate pricing rule')
    }
  }

  // Group pricing rules by variationName
  function groupedPricingRules() {
    const groups: Record<string, PricingRule[]> = {}
    for (const rule of pricingRules) {
      const key = rule.variationName || '(Default)'
      if (!groups[key]) groups[key] = []
      groups[key].push(rule)
    }
    return groups
  }

  async function fetchProducts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterDept) params.set('department', filterDept)
    try {
      const res = await fetch(`/api/products?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingProduct(null)
    setFormName('')
    setFormSku('')
    setFormDept(filterDept || '')
    setFormDescription('')
    setFormBasePrice(0)
    setFormToothCount(false)
    setFormToothSelection(false)
    setError(null)
    setShowModal(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setFormName(product.name)
    setFormSku(product.sku || '')
    setFormDept(product.department)
    setFormDescription(product.description || '')
    setFormBasePrice(product.basePrice)
    setFormToothCount(product.requiresToothCount)
    setFormToothSelection(product.requiresToothSelection)
    setError(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {
      name: formName,
      sku: formSku || undefined,
      department: formDept,
      description: formDescription || undefined,
      basePrice: formBasePrice,
      requiresToothCount: formToothCount,
      requiresToothSelection: formToothSelection,
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setShowModal(false)
        fetchProducts()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save product')
      }
    } catch {
      setError('Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Pricing</h1>
          <p className="text-sm text-gray-500">Manage products, base prices, and custom pricing rules</p>
        </div>
        {activeTab === 'products' && (
          <button
            onClick={openAddModal}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
          >
            Add Product
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'products'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'pricing'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pricing Variations
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          {/* Filter */}
          <div className="mb-4">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          {/* Products Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Department</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Base Price</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Tooth Count</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Active</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Pricing Rules</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                        Loading products...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                        No products found. Add your first product to get started.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3">
                          <div className="text-sm font-medium text-gray-900">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-gray-500">{p.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{p.sku || '—'}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {DEPARTMENT_LABELS[p.department as keyof typeof DEPARTMENT_LABELS] || p.department}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(p.basePrice)}
                        </td>
                        <td className="px-6 py-3 text-center">
                          {p.requiresToothCount || p.requiresToothSelection ? (
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Yes
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center text-sm text-gray-600">
                          {p.pricingRules.length}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => openEditModal(p)}
                            className="text-sm font-medium text-brand-700 hover:text-brand-800"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'pricing' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Pricing Variations</h3>
            <div className="flex gap-2">
              {Object.keys(pricingEdits).length > 0 && (
                <span className="self-center text-xs text-amber-600 font-medium mr-2">
                  {Object.keys(pricingEdits).length} unsaved change{Object.keys(pricingEdits).length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={handleBulkSave}
                disabled={Object.keys(pricingEdits).length === 0 || bulkSaving}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
              >
                {bulkSaving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>

          {pricingLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading pricing rules...</div>
          ) : pricingRules.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No pricing variations found. Pricing rules are created per product to override base prices for specific clinics or dentists.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPricingRules()).map(([variationName, rules]) => (
                <div key={variationName} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-800">{variationName}</h4>
                      <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {rules.length} rule{rules.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setDuplicatingId(rules[0].id)
                        setDuplicateName('')
                      }}
                      className="text-xs font-medium text-brand-700 hover:text-brand-800"
                    >
                      Duplicate Variation
                    </button>
                  </div>

                  {duplicatingId === rules[0].id && (
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2.5 border-b border-blue-100">
                      <input
                        type="text"
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.target.value)}
                        placeholder="New variation name..."
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        onClick={() => handleDuplicate(rules[0].id)}
                        disabled={!duplicateName.trim()}
                        className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => { setDuplicatingId(null); setDuplicateName('') }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-2 text-left text-[11px] font-medium uppercase text-gray-500">Product</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium uppercase text-gray-500">Department</th>
                        <th className="px-4 py-2 text-left text-[11px] font-medium uppercase text-gray-500">Clinic / Dentist</th>
                        <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-gray-500">Base Price</th>
                        <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-gray-500">Override Price</th>
                        <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-gray-500">Min Teeth</th>
                        <th className="px-4 py-2 text-right text-[11px] font-medium uppercase text-gray-500">Add. Tooth Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rules.map((rule) => {
                        const edited = pricingEdits[rule.id]
                        return (
                          <tr key={rule.id} className={`hover:bg-gray-50 ${edited ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {rule.product.name}
                              {rule.product.sku && (
                                <span className="ml-1.5 text-xs text-gray-400">({rule.product.sku})</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                {DEPARTMENT_LABELS[rule.product.department as keyof typeof DEPARTMENT_LABELS] || rule.product.department}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {rule.clinic?.name || rule.dentist?.name || 'All'}
                              {rule.clinic && rule.dentist && (
                                <span className="text-xs text-gray-400"> / {rule.dentist.name}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-gray-500">
                              {formatCurrency(rule.product.basePrice)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                value={edited?.price ?? rule.price}
                                onChange={(e) => handlePriceEdit(rule.id, 'price', parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm font-medium text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                value={edited?.minTeeth ?? rule.minTeeth ?? ''}
                                onChange={(e) => handlePriceEdit(rule.id, 'minTeeth', e.target.value ? parseInt(e.target.value) : null)}
                                min={1}
                                className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input
                                type="number"
                                value={edited?.additionalToothPrice ?? rule.additionalToothPrice ?? ''}
                                onChange={(e) => handlePriceEdit(rule.id, 'additionalToothPrice', e.target.value ? parseFloat(e.target.value) : null)}
                                min={0}
                                step={0.01}
                                className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                placeholder="-"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>SKU</label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">Select</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {DEPARTMENT_LABELS[d]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className={inputClass}
                    rows={2}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Base Price (£) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formToothCount}
                      onChange={(e) => setFormToothCount(e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Requires tooth count
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formToothSelection}
                      onChange={(e) => setFormToothSelection(e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Requires tooth selection
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
