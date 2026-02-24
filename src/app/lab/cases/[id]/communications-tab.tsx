'use client'

import { useState } from 'react'
import { HaloChatPanel } from '@/components/halochat-panel'

interface EmailMessage {
  id: string
  fromAddress: string
  toAddress: string
  ccAddress: string | null
  subject: string
  bodyHtml: string | null
  bodyText: string | null
  direction: string
  createdAt: string
}

interface EmailThread {
  id: string
  subject: string
  createdAt: string
  updatedAt: string
  messages: EmailMessage[]
}

interface WhatsAppMessage {
  id: string
  contactName: string
  contactPhone: string
  direction: string
  messageType: string
  content: string
  status: string
  createdAt: string
}

interface CommunicationsTabProps {
  caseId: string
  emailThreads: EmailThread[]
  whatsappMessages: WhatsAppMessage[]
  currentUserId: string
  currentUserType: string
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelative(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDateTime(date)
}

export function CommunicationsTab({
  caseId,
  emailThreads,
  whatsappMessages,
  currentUserId,
  currentUserType,
}: CommunicationsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'email' | 'whatsapp' | 'halochat'>('email')

  const subTabs = [
    { key: 'email' as const, label: 'Email', count: emailThreads.length },
    { key: 'whatsapp' as const, label: 'WhatsApp', count: whatsappMessages.length },
    { key: 'halochat' as const, label: 'HaloChat', count: null },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Sub-tab navigation */}
      <div className="border-b border-gray-200 px-6">
        <nav className="-mb-px flex gap-6">
          {subTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 pt-3 text-sm font-medium transition-colors ${
                activeSubTab === tab.key
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  activeSubTab === tab.key ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Email sub-tab */}
      {activeSubTab === 'email' && (
        <div>
          {emailThreads.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No email threads linked to this case.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {emailThreads.map((thread) => (
                <div key={thread.id}>
                  <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-900">{thread.subject}</h3>
                    <p className="text-xs text-gray-500">
                      {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''} &middot;
                      Last updated {formatRelative(thread.updatedAt)}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {thread.messages.map((msg) => (
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
                          <span className="text-xs text-gray-500">{formatDateTime(msg.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{msg.subject}</p>
                        {msg.bodyText && (
                          <p className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-sm text-gray-700">
                            {msg.bodyText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp sub-tab */}
      {activeSubTab === 'whatsapp' && (
        <div>
          {whatsappMessages.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No WhatsApp messages linked to this case.
            </div>
          ) : (
            <div className="px-4 py-4 space-y-2 max-h-[500px] overflow-y-auto">
              {whatsappMessages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND'
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOutbound
                          ? 'bg-green-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {!isOutbound && (
                        <p className="text-[11px] font-semibold text-green-700 mb-0.5">
                          {msg.contactName}
                          <span className="font-normal text-gray-400 ml-1">{msg.contactPhone}</span>
                        </p>
                      )}
                      {msg.messageType === 'text' ? (
                        <p className={`text-sm whitespace-pre-wrap ${isOutbound ? 'text-white' : 'text-gray-800'}`}>
                          {msg.content}
                        </p>
                      ) : (
                        <p className={`text-sm italic ${isOutbound ? 'text-white/80' : 'text-gray-500'}`}>
                          [{msg.messageType}] {msg.content}
                        </p>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] ${isOutbound ? 'text-white/60' : 'text-gray-400'}`}>
                          {formatDateTime(msg.createdAt)}
                        </span>
                        {isOutbound && (
                          <span className={`text-[10px] ${
                            msg.status === 'read' ? 'text-blue-200' : 'text-white/60'
                          }`}>
                            {msg.status === 'read' ? ' (read)' : msg.status === 'delivered' ? ' (delivered)' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* HaloChat sub-tab */}
      {activeSubTab === 'halochat' && (
        <HaloChatPanel
          caseId={caseId}
          currentUserId={currentUserId}
          currentUserType={currentUserType}
        />
      )}
    </div>
  )
}
