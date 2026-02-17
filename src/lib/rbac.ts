import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from './auth'
import { hasPermission, Role, UserType } from './constants'

export interface AuthUser {
  id: string
  email: string
  name: string
  userType: string
  role: string
  clinicId: string | null
  dentistId: string | null
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session.user as AuthUser
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) throw new AuthError('Unauthorized', 401)
  return user
}

export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth()
  if (!roles.includes(user.role as Role)) {
    throw new AuthError('Forbidden', 403)
  }
  return user
}

export async function requireUserType(...types: UserType[]): Promise<AuthUser> {
  const user = await requireAuth()
  if (!types.includes(user.userType as UserType)) {
    throw new AuthError('Forbidden', 403)
  }
  return user
}

export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth()
  if (!hasPermission(user.role as Role, permission)) {
    throw new AuthError('Forbidden', 403)
  }
  return user
}

export async function requireInternal(): Promise<AuthUser> {
  return requireUserType('INTERNAL')
}

export async function requireClinicAccess(clinicId: string): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.userType === 'INTERNAL') return user
  if (user.userType === 'CLINIC' && user.clinicId === clinicId) return user
  if (user.userType === 'DENTIST' && user.clinicId === clinicId) return user
  throw new AuthError('Forbidden', 403)
}

export async function requireDentistAccess(dentistId: string): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.userType === 'INTERNAL') return user
  if (user.userType === 'DENTIST' && user.dentistId === dentistId) return user
  throw new AuthError('Forbidden', 403)
}

export async function requireCaseAccess(caseData: { clinicId: string; dentistId: string }): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.userType === 'INTERNAL') return user
  if (user.userType === 'CLINIC' && user.clinicId === caseData.clinicId) return user
  if (user.userType === 'DENTIST' && user.dentistId === caseData.dentistId) return user
  throw new AuthError('Forbidden', 403)
}

// Build WHERE clause scoped to user's access
export function scopeQuery(user: AuthUser): Record<string, string> {
  if (user.userType === 'INTERNAL') return {}
  if (user.userType === 'CLINIC') return { clinicId: user.clinicId! }
  if (user.userType === 'DENTIST') return { dentistId: user.dentistId! }
  return { id: 'NONE' } // deny all
}

export function scopeCaseQuery(user: AuthUser) {
  if (user.userType === 'INTERNAL') return {}
  if (user.userType === 'CLINIC') return { clinicId: user.clinicId! }
  if (user.userType === 'DENTIST') return { dentistId: user.dentistId! }
  return { id: 'NONE' }
}

export function scopeInvoiceQuery(user: AuthUser) {
  if (user.userType === 'INTERNAL') return {}
  if (user.userType === 'CLINIC') return { clinicId: user.clinicId! }
  if (user.userType === 'DENTIST') return { dentistId: user.dentistId! }
  return { id: 'NONE' }
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('Unexpected error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

// Middleware-style wrapper for API routes
export function withAuth(
  handler: (req: NextRequest, user: AuthUser) => Promise<NextResponse>,
  options?: { permission?: string; roles?: Role[]; userTypes?: UserType[] }
) {
  return async (req: NextRequest) => {
    try {
      let user: AuthUser
      if (options?.roles) {
        user = await requireRole(...options.roles)
      } else if (options?.userTypes) {
        user = await requireUserType(...options.userTypes)
      } else if (options?.permission) {
        user = await requirePermission(options.permission)
      } else {
        user = await requireAuth()
      }
      return await handler(req, user)
    } catch (error) {
      return handleAuthError(error)
    }
  }
}
