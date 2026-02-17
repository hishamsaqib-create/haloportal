'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string | number
}

interface SidebarProps {
  title: string
  subtitle?: string
  items: NavItem[]
  bottomItems?: NavItem[]
}

export function Sidebar({ title, subtitle, items, bottomItems }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200/80 bg-white/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 border-b border-gray-200/60 px-5">
        <Logo variant="compact" className="h-5 w-auto" color="#1d1d1f" />
        <div className="h-4 w-px bg-gray-200" />
        <div>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{subtitle || 'Portal'}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <span className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-gray-400')}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[18px]',
                      isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {bottomItems && (
        <div className="border-t border-gray-200/60 px-3 py-3">
          <ul className="space-y-0.5">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <span className={cn('flex-shrink-0', isActive ? 'text-white' : 'text-gray-400')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-200/60 px-5 py-3">
        <p className="text-[10px] text-gray-400 font-medium">Halo Dental Lab v2.0</p>
      </div>
    </aside>
  )
}
