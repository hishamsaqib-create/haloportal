'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { HaloChatPanel } from '@/components/halochat-panel'

type SubTab = 'halochat' | 'email' | 'whatsapp'

interface EmailThread {
  id: string
  subject: string
  caseId: string | null
  createdAt: string
  _count: { messages: number }
}

interface WhatsAppMsg {
  id: string
  contactName: string
  contactPhone: string
  direction: string
  content: string
  status: string
  createdAt: string
  case: { id: string; caseNumber: string } | null
}

export default function CommunicationsPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<SubTab>('halochat')
  const [emails, setEmails] = useState<EmailThread[]>([])
  const [whatsapp, setWhatsapp] = useState<WhatsAppMsg[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab === 'email') loadEmails()
    if (tab === 'whatsapp') loadWhatsApp()
  }, [tab])

  async function loadEmails() {
    setLoading(true)
    try {
      const res = await fetch('/api/email/threads')
      if (res.ok) { const d = await res.json(); setEmails(d.data || []) }
    } catch { toast.error('Failed to load emails') }
    finally { setLoading(false) }
  }

  async function loadWhatsApp() {
    setLoading(true)
    try {
      const res = await fetch('/api/whatsapp')
      if (res.ok) { const d = await res.json(); setWhatsapp(d.data || []) }
    } catch { toast.error('Failed to load WhatsApp messages') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Communications</h1>
        <p className="text-[13px] text-gray-500 mt-1">Email, WhatsApp and HaloChat messages in one place</p>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {(['halochat', 'email', 'whatsapp'] as SubTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'halochat' ? 'HaloChat' : t === 'email' ? 'Email' : 'WhatsApp'}
          </button>
        ))}
      </div>

      {tab === 'halochat' && (
        <div className="rounded-xl border border-gray-200 bg-white" style={{ height: '600px' }}>
          <HaloChatPanel
            currentUserId={session?.user?.id || ''}
            currentUserType="INTERNAL"
          />
        </div>
      )}

      {tab === 'email' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading emails...</div>
          ) : emails.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No email threads found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject</th>
                  <th className="px-5 py-3 text-center text-xs font-medium uppercase text-gray-500">Messages</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {emails.map((thread) => (
                  <tr key={thread.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{thread.subject}</td>
                    <td className="px-5 py-3 text-center text-sm text-gray-500">{thread._count.messages}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(thread.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading WhatsApp messages...</div>
          ) : whatsapp.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No WhatsApp messages found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {whatsapp.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className={`mt-1 h-2 w-2 rounded-full ${msg.direction === 'INBOUND' ? 'bg-green-400' : 'bg-blue-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{msg.contactName}</span>
                      <span className="text-xs text-gray-400">{msg.contactPhone}</span>
                      {msg.case && <span className="text-xs text-brand-700">{msg.case.caseNumber}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{msg.content}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
