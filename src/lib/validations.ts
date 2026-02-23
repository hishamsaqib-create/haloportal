import { z } from 'zod'
import { DEPARTMENTS, PRIORITIES, CASE_STATUSES, REMAKE_REASON_CODES, DELIVERY_STATUSES, DELIVERY_METHODS } from './constants'

export const createCaseSchema = z.object({
  clinicId: z.string().min(1, 'Clinic is required'),
  dentistId: z.string().min(1, 'Dentist is required'),
  patientRef: z.string().optional(),
  patientFirstName: z.string().optional(),
  patientLastName: z.string().optional(),
  patientInitials: z.string().optional(),
  department: z.enum(DEPARTMENTS),
  priority: z.enum(PRIORITIES).default('NORMAL'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().optional(),
    description: z.string().min(1),
    qty: z.number().int().min(1).default(1),
    toothNumbers: z.array(z.number()).optional(),
    material: z.string().optional(),
    shade: z.string().optional(),
    notes: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
    unitPrice: z.number().min(0).optional(),
  })).min(1, 'At least one item is required'),
})

export const updateCaseStatusSchema = z.object({
  status: z.enum(CASE_STATUSES),
  notes: z.string().optional(),
})

export const createProductSchema = z.object({
  department: z.enum(DEPARTMENTS),
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().min(0),
  requiresToothCount: z.boolean().default(false),
  requiresToothSelection: z.boolean().default(false),
  parameterSchema: z.string().optional(),
})

export const createRemakeSchema = z.object({
  caseId: z.string().min(1),
  caseItemId: z.string().optional(),
  reasonCode: z.enum(REMAKE_REASON_CODES),
  reasonText: z.string().optional(),
  costEstimate: z.number().optional(),
})

export const createInvoiceSchema = z.object({
  clinicId: z.string().min(1),
  dentistId: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  caseIds: z.array(z.string()).optional(),
  vatRate: z.number().min(0).max(100).default(20),
})

export const createOutsourceOrderSchema = z.object({
  caseId: z.string().min(1),
  referralCentreId: z.string().min(1),
  notes: z.string().optional(),
})

export const sendEmailSchema = z.object({
  to: z.string().email(),
  cc: z.string().optional(),
  subject: z.string().min(1),
  html: z.string().min(1),
  caseId: z.string().optional(),
  templateId: z.string().optional(),
})

export const jotformWebhookSchema = z.object({
  formID: z.string().optional(),
  submissionID: z.string().optional(),
  rawRequest: z.string().optional(),
}).passthrough()

export const inviteUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  userType: z.enum(['INTERNAL', 'DENTIST', 'CLINIC']),
  role: z.string().min(1),
  clinicId: z.string().optional(),
  dentistId: z.string().optional(),
})

export const createDeliverySchema = z.object({
  clinicId: z.string().min(1, 'Clinic is required'),
  caseIds: z.array(z.string()).min(1, 'At least one case is required'),
  method: z.enum(DELIVERY_METHODS).default('COURIER'),
  trackingRef: z.string().optional(),
  driverName: z.string().optional(),
  notes: z.string().optional(),
  estimatedDate: z.string().optional(),
})

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
  notes: z.string().optional(),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type CreateRemakeInput = z.infer<typeof createRemakeSchema>
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>
