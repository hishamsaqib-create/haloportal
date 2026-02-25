import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, addDays, isBefore } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateDeliveryNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `DEL-${year}-${random}`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy HH:mm')
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function getDueStatus(dueDate: Date | string | null | undefined): 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal' | null {
  if (!dueDate) return null
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'today'
  if (isTomorrow(d)) return 'tomorrow'
  if (isBefore(d, addDays(new Date(), 3))) return 'soon'
  return 'normal'
}

export function getDueStatusColor(status: ReturnType<typeof getDueStatus>): string {
  switch (status) {
    case 'overdue': return 'text-red-700 bg-red-50 border-red-200'
    case 'today': return 'text-orange-700 bg-orange-50 border-orange-200'
    case 'tomorrow': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'soon': return 'text-blue-700 bg-blue-50 border-blue-200'
    default: return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

