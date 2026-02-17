import * as React from 'react'
import { cn } from '@/lib/utils'

export interface StatsCardProps {
  /** Descriptive title for the metric. */
  title: string
  /** The primary metric value. */
  value: string | number
  /** Optional change indicator text (e.g. "+12%" or "-3 this week"). */
  change?: string
  /** Optional icon rendered in the top-right area. */
  icon?: React.ReactNode
  /** Direction of the trend -- controls colour of the change text. */
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

const trendStyles: Record<NonNullable<StatsCardProps['trend']>, string> = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-500',
}

const trendArrows: Record<NonNullable<StatsCardProps['trend']>, string> = {
  up: '\u2191',    // arrow up
  down: '\u2193',  // arrow down
  neutral: '\u2192', // arrow right
}

function StatsCard({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            {value}
          </p>
          {change && (
            <p className={cn('mt-2 flex items-center gap-1 text-sm font-medium', trendStyles[trend])}>
              <span aria-hidden="true">{trendArrows[trend]}</span>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-4 flex-shrink-0 rounded-lg bg-blue-50 p-3 text-blue-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export { StatsCard }
