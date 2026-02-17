'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
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
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="h-8 w-8 rounded-lg bg-brand-700 flex items-center justify-center">
          <span className="text-white font-bold text-sm">H</span>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'sidebar-link',
                    isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {bottomItems && (
        <div className="border-t border-gray-200 p-4">
          <ul className="space-y-1">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'sidebar-link',
                      isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </aside>
  )
}
