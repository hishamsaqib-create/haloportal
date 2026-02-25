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

  const TAB_CONFIG: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'halochat',
      label: 'HaloChat',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Communications</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage all dentist conversations in one place</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'halochat' && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden h-full">
            <HaloChatPanel
              currentUserId={session?.user?.id || ''}
              currentUserType="INTERNAL"
            />
          </div>
        )}

        {tab === 'email' && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden h-full">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-400">Loading emails...</div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">No email threads</p>
                <p className="text-xs text-gray-400 mt-1">Email conversations will appear here when sent</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Subject</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">Messages</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {emails.map((thread) => (
                    <tr key={thread.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{thread.subject}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {thread._count.messages}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{new Date(thread.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'whatsapp' && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden h-full overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-sm text-gray-400">Loading WhatsApp messages...</div>
            ) : whatsapp.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-500">No WhatsApp messages</p>
                <p className="text-xs text-gray-400 mt-1">Configure WhatsApp in Settings to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {whatsapp.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${msg.direction === 'INBOUND' ? 'bg-green-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{msg.contactName}</span>
                        <span className="text-xs text-gray-400">{msg.contactPhone}</span>
                        {msg.case && (
                          <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            {msg.case.caseNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">{msg.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
