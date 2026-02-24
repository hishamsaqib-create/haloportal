export const USER_TYPES = ['INTERNAL', 'DENTIST', 'CLINIC'] as const
export type UserType = (typeof USER_TYPES)[number]

export const ROLES = [
  'SUPER_ADMIN',
  'LAB_MANAGER',
  'LAB_STAFF',
  'CLINIC_ADMIN',
  'CLINIC_FINANCE',
  'DENTIST_USER',
] as const
export type Role = (typeof ROLES)[number]

export const DEPARTMENTS = ['CERAMICS', 'APPLIANCES', 'DSD'] as const
export type Department = (typeof DEPARTMENTS)[number]

export const CASE_STATUSES = [
  'NEW',
  'REVIEWED',
  'IN_PRODUCTION',
  'SENT_OUTSOURCE',
  'RECEIVED',
  'QC',
  'READY',
  'DISPATCHED',
  'COMPLETED',
  'CANCELLED',
] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const DEPARTMENT_STATUSES: Record<Department, CaseStatus[]> = {
  CERAMICS: ['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED'],
  APPLIANCES: ['NEW', 'REVIEWED', 'IN_PRODUCTION', 'QC', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED'],
  DSD: ['NEW', 'REVIEWED', 'IN_PRODUCTION', 'SENT_OUTSOURCE', 'RECEIVED', 'QC', 'READY', 'DISPATCHED', 'COMPLETED', 'CANCELLED'],
}

export const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export type Priority = (typeof PRIORITIES)[number]

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const OUTSOURCE_STATUSES = ['QUEUED', 'SENT', 'RECEIVED', 'RETURNED'] as const
export type OutsourceStatus = (typeof OUTSOURCE_STATUSES)[number]

export const SUPPLIER_INVOICE_STATUSES = ['UNPAID', 'PAID', 'DISPUTED'] as const
export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number]

export const REMAKE_REASON_CODES = [
  'MATERIAL_DEFECT',
  'FIT_ISSUE',
  'SHADE_MISMATCH',
  'BREAKAGE',
  'DESIGN_ERROR',
  'OTHER',
] as const
export type RemakeReasonCode = (typeof REMAKE_REASON_CODES)[number]

export const REMAKE_REASON_LABELS: Record<RemakeReasonCode, string> = {
  MATERIAL_DEFECT: 'Material Defect',
  FIT_ISSUE: 'Fit Issue',
  SHADE_MISMATCH: 'Shade Mismatch',
  BREAKAGE: 'Breakage',
  DESIGN_ERROR: 'Design Error',
  OTHER: 'Other',
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: 'New',
  REVIEWED: 'Reviewed',
  IN_PRODUCTION: 'In Production',
  SENT_OUTSOURCE: 'Sent to Outsource',
  RECEIVED: 'Received',
  QC: 'Quality Check',
  READY: 'Ready',
  DISPATCHED: 'Dispatched',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  CERAMICS: 'Ceramics',
  APPLIANCES: 'Appliances',
  DSD: 'DSD',
}

export const DELIVERY_STATUSES = ['PENDING', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED', 'FAILED'] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  PENDING: 'Pending',
  COLLECTED: 'Collected',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
}

export const DELIVERY_METHODS = ['COURIER', 'ROYAL_MAIL', 'HAND_DELIVERY', 'COLLECTION', 'OTHER'] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  COURIER: 'Courier',
  ROYAL_MAIL: 'Royal Mail',
  HAND_DELIVERY: 'Hand Delivery',
  COLLECTION: 'Collection',
  OTHER: 'Other',
}

export const SCANNER_TYPES = ['ITERO', 'TRIOS', 'MEDIT', 'PRIMESCAN', 'OTHER'] as const
export type ScannerType = (typeof SCANNER_TYPES)[number]

export const SCANNER_LABELS: Record<ScannerType, string> = {
  ITERO: 'iTero',
  TRIOS: '3Shape TRIOS',
  MEDIT: 'Medit',
  PRIMESCAN: 'Primescan',
  OTHER: 'Other',
}

export const SCANNER_PORTAL_URLS: Record<ScannerType, string> = {
  ITERO: 'https://myitero.com',
  TRIOS: 'https://communicate.3shapecommunicate.com',
  MEDIT: 'https://medit.link',
  PRIMESCAN: 'https://connect.dentsplysirona.com',
  OTHER: '',
}

export const SCANNER_ORDER_STATUSES = ['NEW', 'DOWNLOADED', 'LINKED', 'COMPLETED'] as const
export type ScannerOrderStatus = (typeof SCANNER_ORDER_STATUSES)[number]

export const SCANNER_ORDER_STATUS_LABELS: Record<ScannerOrderStatus, string> = {
  NEW: 'New',
  DOWNLOADED: 'Downloaded',
  LINKED: 'Linked to Case',
  COMPLETED: 'Completed',
}

export const INTERNAL_ROLES: Role[] = ['SUPER_ADMIN', 'LAB_MANAGER', 'LAB_STAFF']
export const CLINIC_ROLES: Role[] = ['CLINIC_ADMIN', 'CLINIC_FINANCE']
export const DENTIST_ROLES: Role[] = ['DENTIST_USER']

// Permissions map
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  LAB_MANAGER: [
    'cases:read', 'cases:write', 'cases:status',
    'products:read', 'products:write',
    'invoices:read', 'invoices:write',
    'outsource:read', 'outsource:write',
    'email:read', 'email:write',
    'remakes:read', 'remakes:write',
    'prescriptions:read', 'prescriptions:write',
    'reports:read',
    'clinics:read', 'dentists:read',
    'users:read',
    'referral-centres:read', 'referral-centres:write',
    'supplier-invoices:read', 'supplier-invoices:write',
    'statements:read', 'statements:write',
  ],
  LAB_STAFF: [
    'cases:read', 'cases:status',
    'products:read',
    'outsource:read',
    'remakes:read',
    'prescriptions:read',
  ],
  CLINIC_ADMIN: [
    'portal:clinic:cases:read',
    'portal:clinic:invoices:read',
    'portal:clinic:statements:read',
    'portal:clinic:dentists:read',
    'portal:clinic:users:manage',
    'portal:clinic:messages:read', 'portal:clinic:messages:write',
  ],
  CLINIC_FINANCE: [
    'portal:clinic:invoices:read',
    'portal:clinic:statements:read',
    'portal:clinic:cases:read',
  ],
  DENTIST_USER: [
    'portal:dentist:cases:read',
    'portal:dentist:invoices:read',
    'portal:dentist:statements:read',
    'portal:dentist:prescriptions:read',
    'portal:dentist:messages:read', 'portal:dentist:messages:write',
  ],
}

export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

/** Roles that can view financial data (costs, prices, invoices, revenue) */
export function canViewFinancials(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'LAB_MANAGER'
}
