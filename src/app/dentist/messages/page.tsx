'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

interface Thread {
  id: string
  subject: string
  caseId: string | null
  createdAt: string
  messages: Message[]
}

interface Message {
  id: string
  fromAddress: string
  toAddress: string
  subject: string
  bodyText: string | null
  bodyHtml: string | null
  direction: string
  createdAt: string
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const caseId = searchParams.get('case')
  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [composing, setComposing] = useState(!!caseId)
  const [newMessage, setNewMessage] = useState({ subject: '', body: '', caseId: caseId || '' })

  useEffect(() => {
    fetchThreads()
  }, [])

  async function fetchThreads() {
    setLoading(true)
    const params = new URLSearchParams()
    if (caseId) params.set('caseId', caseId)
    const res = await fetch(`/api/email?${params}`)
    if (res.ok) {
      const data = await res.json()
      setThreads(data.threads || [])
    }
    setLoading(false)
  }

  async function handleSend() {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: newMessage.subject,
        html: `<p>${newMessage.body.replace(/\n/g, '<br/>')}</p>`,
        to: 'lab@halolab.co.uk', // Messages from dentists go to lab
        caseId: newMessage.caseId || undefined,
      }),
    })
    if (res.ok) {
      setComposing(false)
      setNewMessage({ subject: '', body: '', caseId: '' })
      fetchThreads()
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Communicate with the lab</p>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
        >
          New Message
        </button>
      </div>

      {composing && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Compose Message</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Subject"
              />
            </div>
            {caseId && (
              <p className="text-xs text-gray-500">Linked to case: {caseId}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={newMessage.body}
                onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Type your message..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => setComposing(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Thread list */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">No conversations yet</div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{thread.subject}</p>
                  <p className="text-xs text-gray-500">
                    {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''} · {formatDateTime(thread.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {selectedThread ? (
            <>
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">{selectedThread.subject}</h2>
              </div>
              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                {selectedThread.messages.map((msg) => (
                  <div key={msg.id} className={`rounded-lg p-4 ${
                    msg.direction === 'OUTBOUND' ? 'bg-blue-50 ml-12' : 'bg-gray-50 mr-12'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        {msg.direction === 'OUTBOUND' ? 'You' : 'Lab'}
                      </span>
                      <span className="text-xs text-gray-500">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {msg.bodyText || 'HTML content'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-gray-500">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DentistMessagesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading...</div>}>
      <MessagesContent />
    </Suspense>
  )
}
