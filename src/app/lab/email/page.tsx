'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDateTime, formatRelative } from '@/lib/utils'

interface EmailThread {
  id: string
  subject: string
  caseId: string | null
  createdAt: string
  updatedAt: string
  case: {
    id: string
    caseNumber: string
  } | null
  messages: {
    id: string
    fromAddress: string
    toAddress: string
    subject: string
    bodyText: string | null
    direction: string
    createdAt: string
  }[]
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  category: string | null
}

export default function EmailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [showCompose, setShowCompose] = useState(false)

  // Compose form state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeCaseId, setComposeCaseId] = useState('')
  const [composeTemplateId, setComposeTemplateId] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    fetchThreads()
    fetchTemplates()
  }, [])

  async function fetchThreads() {
    setLoading(true)
    try {
      const res = await fetch('/api/email')
      if (res.ok) {
        const data = await res.json()
        setThreads(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/email/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.data || [])
      }
    } catch {
      // ignore
    }
  }

  function selectTemplate(templateId: string) {
    setComposeTemplateId(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setComposeSubject(template.subject)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo,
          subject: composeSubject,
          html: composeBody,
          caseId: composeCaseId || undefined,
          templateId: composeTemplateId || undefined,
        }),
      })
      if (res.ok) {
        setShowCompose(false)
        setComposeTo('')
        setComposeSubject('')
        setComposeBody('')
        setComposeCaseId('')
        setComposeTemplateId('')
        fetchThreads()
      } else {
        const data = await res.json()
        setSendError(data.error || 'Failed to send email')
      }
    } catch {
      setSendError('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email</h1>
          <p className="text-sm text-gray-500">Manage email communication with clinics and referral centres</p>
        </div>
        <button
          onClick={() => {
            setShowCompose(true)
            setSelectedThread(null)
          }}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          Compose Email
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Thread List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Email Threads</h2>
            </div>
            {loading ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                No email threads yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => {
                      setSelectedThread(thread)
                      setShowCompose(false)
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      selectedThread?.id === thread.id ? 'bg-brand-50 border-l-2 border-brand-700' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate pr-2">
                        {thread.subject}
                      </p>
                      <span className="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                        {thread.messages.length}
                      </span>
                    </div>
                    {thread.case && (
                      <p className="mt-0.5 text-xs text-brand-600">{thread.case.caseNumber}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">{formatRelative(thread.updatedAt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thread Detail / Compose */}
        <div className="lg:col-span-2">
          {showCompose ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Compose Email</h2>

              {sendError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {sendError}
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="recipient@example.com"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                    <select
                      value={composeTemplateId}
                      onChange={(e) => selectTemplate(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">No template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.category ? `(${t.category})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Email subject"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Case</label>
                  <input
                    type="text"
                    value={composeCaseId}
                    onChange={(e) => setComposeCaseId(e.target.value)}
                    placeholder="Case ID (optional)"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Write your email..."
                    className={inputClass}
                    rows={10}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Rich text editor coming soon. Plain text or HTML supported.
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCompose(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </form>
            </div>
          ) : selectedThread ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{selectedThread.subject}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span>{selectedThread.messages.length} message{selectedThread.messages.length !== 1 ? 's' : ''}</span>
                  {selectedThread.case && (
                    <Link
                      href={`/lab/cases/${selectedThread.case.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {selectedThread.case.caseNumber}
                    </Link>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {selectedThread.messages.map((msg) => (
                  <div key={msg.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            msg.direction === 'OUTBOUND'
                              ? 'bg-brand-50 text-brand-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {msg.direction === 'OUTBOUND' ? 'Sent' : 'Received'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{msg.fromAddress}</span>
                        <span className="text-xs text-gray-400">to {msg.toAddress}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                    {msg.bodyText && (
                      <div className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
                        {msg.bodyText}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-24">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-3 text-sm text-gray-500">
                  Select a thread to view messages or compose a new email.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
