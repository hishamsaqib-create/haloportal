'use client'

import { useState, useEffect } from 'react'
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <button
          onClick={openAddModal}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Add Product
        </button>
      </div>

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
