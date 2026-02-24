export const USER_TYPES = ['INTERNAL', 'DENTIST', 'CLINIC'] as const
export type UserType = (typeof USER_TYPES)[number]

export const ROLES = [
  'SUPER_ADMIN',
  'LAB_MANAGER',
  'LAB_STAFF',
  'LAB_TECHNICIAN',
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

// Status mapping for dentist portal - maps internal statuses to dentist-visible labels
export const DENTIST_STATUS_MAP: Record<string, string> = {
  NEW: 'Submitted',
  REVIEWED: 'In Progress',
  IN_PRODUCTION: 'In Progress',
  SENT_OUTSOURCE: 'In Progress',
  RECEIVED: 'In Progress',
  QC: 'In Progress',
  READY: 'In Progress',
  DISPATCHED: 'Out for Delivery',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const DENTIST_VISIBLE_STATUSES = ['Submitted', 'In Progress', 'Out for Delivery', 'Delivered'] as const

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
  'IMPRESSION_ISSUE',
  'WRONG_SHADE',
  'OTHER',
] as const
export type RemakeReasonCode = (typeof REMAKE_REASON_CODES)[number]

export const REMAKE_REASON_LABELS: Record<RemakeReasonCode, string> = {
  MATERIAL_DEFECT: 'Material Defect',
  FIT_ISSUE: 'Fit Issue',
  SHADE_MISMATCH: 'Shade Mismatch',
  BREAKAGE: 'Breakage',
  DESIGN_ERROR: 'Design Error',
  IMPRESSION_ISSUE: 'Impression Issue',
  WRONG_SHADE: 'Wrong Shade',
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

// Department letter codes for case numbering
export const DEPARTMENT_CODES: Record<Department, string> = {
  CERAMICS: 'C',
  APPLIANCES: 'A',
  DSD: 'D',
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

export const FILE_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const
export type FileDirection = (typeof FILE_DIRECTIONS)[number]

export const FILE_DIRECTION_LABELS: Record<FileDirection, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
}

export const NOTIFICATION_CHANNELS = ['EMAIL', 'WHATSAPP', 'BOTH'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_TRIGGERS = [
  'STATUS_CHANGE',
  'CASE_CREATED',
  'FILE_SHARED',
  'PRESCRIPTION_READY',
  'REMAKE_FLAGGED',
  'DELIVERY_DISPATCHED',
  'DELIVERY_COMPLETED',
] as const

export const NOTIFICATION_TRIGGER_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Status Change',
  CASE_CREATED: 'Case Created',
  FILE_SHARED: 'File Shared with Dentist',
  PRESCRIPTION_READY: 'Prescription Ready',
  REMAKE_FLAGGED: 'Remake Flagged',
  DELIVERY_DISPATCHED: 'Delivery Dispatched',
  DELIVERY_COMPLETED: 'Delivery Completed',
}

export const INTERNAL_ROLES: Role[] = ['SUPER_ADMIN', 'LAB_MANAGER', 'LAB_STAFF', 'LAB_TECHNICIAN']
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
    'communications:read', 'communications:write',
    'settings:read', 'settings:write',
  ],
  LAB_STAFF: [
    'cases:read', 'cases:write', 'cases:status',
    'products:read',
    'outsource:read', 'outsource:write',
    'remakes:read', 'remakes:write',
    'prescriptions:read', 'prescriptions:write',
    'communications:read', 'communications:write',
    'clinics:read', 'dentists:read',
  ],
  LAB_TECHNICIAN: [
    'cases:read', 'cases:status',
    'products:read',
    'outsource:read',
    'remakes:read',
    'prescriptions:read',
    'clinics:read', 'dentists:read',
    // NO: invoices, reports, communications, settings, financial data
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
    'portal:dentist:cases:submit',
    'portal:dentist:invoices:read',
    'portal:dentist:statements:read',
    'portal:dentist:prescriptions:read',
    'portal:dentist:messages:read', 'portal:dentist:messages:write',
    'portal:dentist:files:read',
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

/** Roles that can view communications (email, whatsapp, halochat) */
export function canViewCommunications(role: string): boolean {
  return role !== 'LAB_TECHNICIAN'
}
