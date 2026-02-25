'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'

interface ChatMessage {
  id: string
  caseId: string | null
  senderId: string
  senderType: string
  message: string
  readAt: string | null
  createdAt: string
  sender: {
    id: string
    name: string
    userType: string
  }
  case?: {
    id: string
    caseNumber: string
  } | null
}

interface Conversation {
  dentistId: string
  dentistName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  messageCount: number
}

export interface HaloChatPanelProps {
  caseId?: string
  currentUserId: string
  currentUserType: string
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateSeparator(date: string): string {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function HaloChatPanel({ caseId, currentUserId, currentUserType }: HaloChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedDentistId, setSelectedDentistId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // If used in case-specific mode, skip conversations and show messages directly
  const isCaseMode = !!caseId

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch conversation list (lab side only)
  const fetchConversations = useCallback(async () => {
    if (isCaseMode) return
    try {
      const res = await fetch('/api/halochat/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [isCaseMode])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async () => {
    try {
      let url = '/api/halochat'
      if (caseId) {
        url += `?caseId=${caseId}`
      } else if (selectedDentistId) {
        url += `?dentistId=${selectedDentistId}`
      } else {
        return
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data || [])
      }
    } catch {
      // silently fail
    } finally {
      setMessagesLoading(false)
    }
  }, [caseId, selectedDentistId])

  useEffect(() => {
    if (isCaseMode) {
      setMessagesLoading(true)
      fetchMessages()
      const interval = setInterval(fetchMessages, 10000)
      return () => clearInterval(interval)
    } else {
      fetchConversations()
      const interval = setInterval(fetchConversations, 15000)
      return () => clearInterval(interval)
    }
  }, [isCaseMode, fetchMessages, fetchConversations])

  useEffect(() => {
    if (selectedDentistId) {
      setMessagesLoading(true)
      fetchMessages()
      const interval = setInterval(fetchMessages, 10000)
      return () => clearInterval(interval)
    }
  }, [selectedDentistId, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Mark unread messages as read
  useEffect(() => {
    messages.forEach((msg) => {
      if (!msg.readAt && msg.senderId !== currentUserId) {
        fetch(`/api/halochat/${msg.id}/read`, { method: 'POST' }).catch(() => {})
      }
    })
  }, [messages, currentUserId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch('/api/halochat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          message: newMessage.trim(),
        }),
      })

      if (!res.ok) throw new Error('Failed to send')

      const data = await res.json()
      setMessages((prev) => [...prev, data.data])
      setNewMessage('')
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = []
  messages.forEach((msg) => {
    const dateStr = new Date(msg.createdAt).toDateString()
    const lastGroup = groupedMessages[groupedMessages.length - 1]
    if (lastGroup && new Date(lastGroup.messages[0].createdAt).toDateString() === dateStr) {
      lastGroup.messages.push(msg)
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] })
    }
  })

  const filteredConversations = conversations.filter((c) =>
    c.dentistName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  // Case-specific mode: just show messages directly (no sidebar)
  if (isCaseMode) {
    return (
      <div className="flex flex-col h-full">
        <MessageArea
          loading={messagesLoading}
          groupedMessages={groupedMessages}
          currentUserId={currentUserId}
          scrollContainerRef={scrollContainerRef}
          messagesEndRef={messagesEndRef}
        />
        <MessageInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          handleSend={handleSend}
          sending={sending}
        />
      </div>
    )
  }

  // Full communications mode: sidebar + messages
  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/30">
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Conversations</h3>
            {totalUnread > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search dentists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-gray-300 focus:bg-white"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-gray-400">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-gray-400">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.dentistId}
                onClick={() => setSelectedDentistId(conv.dentistId)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  selectedDentistId === conv.dentistId
                    ? 'bg-white border-l-2 border-l-blue-600'
                    : 'hover:bg-white/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-white">{getInitials(conv.dentistName)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 truncate">{conv.dentistName}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatRelativeTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate pr-2">{conv.lastMessage}</p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedDentistId ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-white">
                    {getInitials(conversations.find((c) => c.dentistId === selectedDentistId)?.dentistName || '')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {conversations.find((c) => c.dentistId === selectedDentistId)?.dentistName}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {conversations.find((c) => c.dentistId === selectedDentistId)?.messageCount || 0} messages
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDentistId(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <MessageArea
              loading={messagesLoading}
              groupedMessages={groupedMessages}
              currentUserId={currentUserId}
              scrollContainerRef={scrollContainerRef}
              messagesEndRef={messagesEndRef}
            />
            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSend={handleSend}
              sending={sending}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/30">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Select a conversation</p>
              <p className="text-xs text-gray-400 mt-1">Choose a dentist from the left to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Extracted sub-components for reuse between case mode and full mode

function MessageArea({
  loading,
  groupedMessages,
  currentUserId,
  scrollContainerRef,
  messagesEndRef,
}: {
  loading: boolean
  groupedMessages: { date: string; messages: ChatMessage[] }[]
  currentUserId: string
  scrollContainerRef: React.Ref<HTMLDivElement>
  messagesEndRef: React.Ref<HTMLDivElement>
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading messages...
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
      {groupedMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-sm text-gray-400">
          No messages yet. Start the conversation below.
        </div>
      ) : (
        groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-3">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-medium text-gray-500">
                {formatDateSeparator(group.messages[0].createdAt)}
              </span>
            </div>

            <div className="space-y-1.5">
              {group.messages.map((msg) => {
                const isMine = msg.senderId === currentUserId
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                        isMine
                          ? 'bg-gray-900 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {!isMine && (
                        <p className="text-[10px] font-semibold mb-0.5 text-blue-600">
                          {msg.sender.name}
                          {msg.case && (
                            <span className="font-normal text-gray-400 ml-1.5">{msg.case.caseNumber}</span>
                          )}
                        </p>
                      )}
                      {isMine && msg.case && (
                        <p className="text-[10px] font-normal mb-0.5 text-white/50">
                          Re: {msg.case.caseNumber}
                        </p>
                      )}
                      <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${isMine ? 'text-white' : 'text-gray-800'}`}>
                        {msg.message}
                      </p>
                      <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[9px] ${isMine ? 'text-white/40' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMine && msg.readAt && (
                          <svg className="h-2.5 w-2.5 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}

function MessageInput({
  newMessage,
  setNewMessage,
  handleSend,
  sending,
}: {
  newMessage: string
  setNewMessage: (v: string) => void
  handleSend: (e: React.FormEvent) => void
  sending: boolean
}) {
  return (
    <form onSubmit={handleSend} className="border-t border-gray-200 px-4 py-3 flex items-center gap-2 bg-white">
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-gray-300 focus:bg-white"
        disabled={sending}
      />
      <button
        type="submit"
        disabled={!newMessage.trim() || sending}
        className="flex items-center justify-center rounded-full bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
        </svg>
      </button>
    </form>
  )
}
