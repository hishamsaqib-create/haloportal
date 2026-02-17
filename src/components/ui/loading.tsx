import * as React from 'react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Spinner                                                                   */
/* -------------------------------------------------------------------------- */

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind width/height class. Defaults to 'h-5 w-5'. */
  size?: string
}

function Spinner({ className, size = 'h-5 w-5', ...props }: SpinnerProps) {
  return (
    <div role="status" aria-label="Loading" {...props}>
      <svg
        className={cn('animate-spin text-current', size, className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  FullPageLoading                                                           */
/* -------------------------------------------------------------------------- */

export interface FullPageLoadingProps {
  /** Optional message displayed below the spinner. */
  message?: string
  className?: string
}

function FullPageLoading({ message, className }: FullPageLoadingProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center gap-4',
        className
      )}
    >
      <Spinner size="h-10 w-10" className="text-blue-600" />
      {message && (
        <p className="text-sm font-medium text-gray-500">{message}</p>
      )}
    </div>
  )
}

export { Spinner, FullPageLoading }
