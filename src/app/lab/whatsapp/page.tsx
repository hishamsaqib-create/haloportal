'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { formatRelative } from '@/lib/utils'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhatsAppMessage {
  id: string
  contactName: string
  contactPhone: string
  direction: 'INBOUND' | 'OUTBOUND'
  messageType: string
  content: string
  status: string
  createdAt: string
  case?: { id: string; caseNumber: string } | null
}

interface Conversation {
  id: string
  contactName: string
  contactPhone: string
  content: string
  direction: 'INBOUND' | 'OUTBOUND'
  createdAt: string
  status: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessageTime(date: string): string {
  const d = new Date(date)
  return format(d, 'HH:mm')
}

function formatConversationTime(date: string): string {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd/MM/yyyy')
}

function formatDateSeparator(date: string): string {
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, d MMMM yyyy')
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: string }) {
  // Single check = sent, double check = delivered, blue double = read
  if (status === 'read') {
    return (
      <svg className="ml-1 inline-block h-4 w-4 text-blue-500" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8.5L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'delivered') {
    return (
      <svg className="ml-1 inline-block h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="none">
        <path d="M1.5 8.5L5 12L14.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8.5L8.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  // sent / pending / default = single check
  return (
    <svg className="ml-1 inline-block h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5L6.5 12L13 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WhatsAppLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#25D366" />
      <path
        d="M34.6 13.3A14.4 14.4 0 0024 9a14.5 14.5 0 00-12.5 21.7L9.6 38l7.5-2a14.4 14.4 0 006.9 1.8h0A14.5 14.5 0 0034.6 13.3zM24 35.4A12 12 0 0117.6 34l-.4-.3-4.6 1.2 1.2-4.5-.3-.4a12 12 0 01-1.8-6.4A12.1 12.1 0 0124 11.5a12 12 0 018.5 3.5 12 12 0 013.5 8.5A12.1 12.1 0 0124 35.4zm6.6-9c-.4-.2-2.2-1.1-2.5-1.2s-.6-.2-.8.2-.9 1.2-1.1 1.4-.4.3-.8.1a10 10 0 01-3-1.8 11.2 11.2 0 01-2-2.6c-.2-.4 0-.6.2-.8l.5-.5.3-.5a.8.8 0 000-.8c-.1-.2-.8-2-1.1-2.8s-.6-.6-.8-.6h-.7a1.3 1.3 0 00-1 .5 4.2 4.2 0 00-1.3 3.1 7.3 7.3 0 001.5 3.9 16.7 16.7 0 006.5 5.7 7.2 7.2 0 002.2.8 5.2 5.2 0 002.4 0 3.8 3.8 0 002.5-1.8 3.1 3.1 0 00.2-1.8c-.1-.1-.3-.2-.6-.4z"
        fill="white"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// New Chat Modal
// ---------------------------------------------------------------------------

function NewChatModal({
  onClose,
  onStartChat,
}: {
  onClose: () => void
  onStartChat: (name: string, phone: string) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    onStartChat(name.trim() || phone.trim(), phone.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7700 900000"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              autoFocus
              required
            />
            <p className="mt-1 text-xs text-gray-400">Include country code, e.g. +44 for UK</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contact Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#20bd5a] transition-colors"
            >
              Start Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [selectedContact, setSelectedContact] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [isConfigured, setIsConfigured] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (phone: string) => {
    setMessagesLoading(true)
    try {
      const res = await fetch(`/api/whatsapp?phone=${encodeURIComponent(phone)}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data || [])
      }
    } catch {
      // ignore
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  // Check if WhatsApp is configured
  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          const settings = data.data || {}
          const phoneId = settings.whatsapp_phone_id?.value
          const token = settings.whatsapp_access_token?.value
          setIsConfigured(!!(phoneId && token))
        } else {
          setIsConfigured(false)
        }
      } catch {
        setIsConfigured(false)
      }
    }
    checkConfig()
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.contactPhone)
    }
  }, [selectedContact, fetchMessages])

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations()
      if (selectedContact) {
        fetchMessages(selectedContact.contactPhone)
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedContact, fetchConversations, fetchMessages])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSelectContact(conversation: Conversation) {
    setSelectedContact(conversation)
    setMessages([])
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageInput.trim() || !selectedContact || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: selectedContact.contactName,
          contactPhone: selectedContact.contactPhone,
          content: messageInput.trim(),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.data])
        setMessageInput('')
        // Update conversation list
        fetchConversations()
        // Focus the input
        messageInputRef.current?.focus()
      }
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  function handleStartNewChat(name: string, phone: string) {
    setShowNewChat(false)
    const newContact: Conversation = {
      id: 'new',
      contactName: name,
      contactPhone: phone,
      content: '',
      direction: 'OUTBOUND',
      createdAt: new Date().toISOString(),
      status: 'new',
    }
    // Check if conversation already exists
    const existing = conversations.find((c) => c.contactPhone === phone)
    if (existing) {
      setSelectedContact(existing)
    } else {
      setSelectedContact(newContact)
      setMessages([])
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  // -------------------------------------------------------------------------
  // Filtered conversations
  // -------------------------------------------------------------------------

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.contactPhone.includes(q) ||
      c.content.toLowerCase().includes(q)
    )
  })

  // -------------------------------------------------------------------------
  // Message grouping by date
  // -------------------------------------------------------------------------

  function getDateGroups(msgs: WhatsAppMessage[]): { date: string; messages: WhatsAppMessage[] }[] {
    const groups: { date: string; messages: WhatsAppMessage[] }[] = []
    let currentDate = ''

    for (const msg of msgs) {
      const msgDate = new Date(msg.createdAt).toDateString()
      if (msgDate !== currentDate) {
        currentDate = msgDate
        groups.push({ date: msg.createdAt, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }

    return groups
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="-m-6">
      {/* Not Configured Banner */}
      {!isConfigured && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm text-amber-800">
              WhatsApp API is not configured. Messages will be saved locally but not delivered.{' '}
              <Link
                href="/lab/settings"
                className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950"
              >
                Configure in Settings
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Layout */}
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden" style={!isConfigured ? { height: 'calc(100vh - 4rem - 49px)' } : {}}>
        {/* ----------------------------------------------------------------- */}
        {/* Left Panel - Contact List                                         */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex w-[380px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowNewChat(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#20bd5a] transition-all duration-200 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border-0 bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all duration-200"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="mt-3 text-sm text-gray-500">
                  {searchQuery ? 'No conversations match your search.' : 'No conversations yet.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Start a new conversation
                  </button>
                )}
              </div>
            ) : (
              <div>
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedContact?.contactPhone === conversation.contactPhone
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectContact(conversation)}
                      className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-all duration-150 ${
                        isSelected
                          ? 'bg-brand-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {getInitials(conversation.contactName)}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {conversation.contactName}
                          </p>
                          <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                            {formatConversationTime(conversation.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[13px] text-gray-500">
                          {conversation.direction === 'OUTBOUND' && (
                            <span className="text-gray-400">You: </span>
                          )}
                          {conversation.content}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Right Panel - Chat View                                           */}
        {/* ----------------------------------------------------------------- */}
        {selectedContact ? (
          <div className="flex flex-1 flex-col bg-[#f0f2f5]">
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3.5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {getInitials(selectedContact.contactName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {selectedContact.contactName}
                </p>
                <p className="text-xs text-gray-500">{selectedContact.contactPhone}</p>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1">
                {messages.some((m) => m.case) && (
                  <Link
                    href={`/lab/cases/${messages.find((m) => m.case)?.case?.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    {messages.find((m) => m.case)?.case?.caseNumber}
                  </Link>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366]/10">
                      <svg className="h-6 w-6 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No messages yet. Send a message to start the conversation.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {getDateGroups(messages).map((group) => (
                    <div key={group.date}>
                      {/* Date Separator */}
                      <div className="my-4 flex items-center justify-center">
                        <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-gray-500 shadow-sm backdrop-blur-sm">
                          {formatDateSeparator(group.date)}
                        </span>
                      </div>

                      {/* Messages */}
                      {group.messages.map((msg) => {
                        const isOutbound = msg.direction === 'OUTBOUND'
                        return (
                          <div
                            key={msg.id}
                            className={`mb-1 flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`relative max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm ${
                                isOutbound
                                  ? 'bg-[#d9fdd3] text-gray-900'
                                  : 'bg-white text-gray-900'
                              }`}
                              style={
                                isOutbound
                                  ? { borderTopRightRadius: '4px' }
                                  : { borderTopLeftRadius: '4px' }
                              }
                            >
                              {/* Linked case badge */}
                              {msg.case && (
                                <Link
                                  href={`/lab/cases/${msg.case.id}`}
                                  className="mb-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 hover:bg-brand-100 transition-colors"
                                >
                                  {msg.case.caseNumber}
                                </Link>
                              )}

                              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.content}</p>

                              {/* Timestamp + Status */}
                              <div className={`mt-1 flex items-center gap-0.5 ${isOutbound ? 'justify-end' : 'justify-end'}`}>
                                <span className="text-[11px] text-gray-500">
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                                {isOutbound && <StatusIcon status={msg.status} />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 bg-white px-5 py-3">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="relative flex-1">
                  <textarea
                    ref={messageInputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="max-h-32 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500/20 transition-all duration-200"
                    style={{ minHeight: '44px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sending}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-all duration-200 hover:bg-[#20bd5a] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  {sending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </form>
              <p className="mt-1.5 px-1 text-[11px] text-gray-400">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>
        ) : (
          /* ----------------------------------------------------------------- */
          /* Empty State                                                        */
          /* ----------------------------------------------------------------- */
          <div className="flex flex-1 items-center justify-center bg-[#f0f2f5]">
            <div className="text-center">
              <div className="mx-auto mb-6">
                <WhatsAppLogo className="mx-auto h-20 w-20" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">WhatsApp Messaging</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Send and receive WhatsApp messages with your clients. Select a conversation from the
                left or start a new chat.
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#20bd5a] transition-all duration-200 active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start New Conversation
              </button>
              <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                End-to-end encrypted
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onStartChat={handleStartNewChat} />
      )}
    </div>
  )
}
