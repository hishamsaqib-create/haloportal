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

interface HaloChatPanelProps {
  caseId: string
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

export function HaloChatPanel({ caseId, currentUserId, currentUserType }: HaloChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/halochat?caseId=${caseId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data || [])
      }
    } catch {
      // Silently fail on fetch
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [fetchMessages])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Loading messages...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-3">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500">
                  {formatDateSeparator(group.messages[0].createdAt)}
                </span>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {group.messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? 'bg-brand-700 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        {!isMine && (
                          <p className={`text-[11px] font-semibold mb-0.5 ${
                            msg.senderType === 'DENTIST' ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {msg.sender.name}
                            <span className="font-normal text-gray-400 ml-1">
                              {msg.senderType === 'DENTIST' ? 'Dentist' : 'Lab'}
                            </span>
                          </p>
                        )}
                        <p className={`text-sm whitespace-pre-wrap ${isMine ? 'text-white' : 'text-gray-800'}`}>
                          {msg.message}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </span>
                          {isMine && msg.readAt && (
                            <svg className="h-3 w-3 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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

      {/* Input area */}
      <form onSubmit={handleSend} className="border-t border-gray-200 px-4 py-3 flex items-center gap-3 bg-white">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:bg-white"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="flex items-center justify-center rounded-full bg-brand-700 p-2.5 text-white hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  )
}
