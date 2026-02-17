import { prisma } from './prisma'

export async function createAuditLog(params: {
  caseId?: string
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string
}) {
  return prisma.auditLog.create({
    data: {
      caseId: params.caseId || null,
      userId: params.userId || null,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      ipAddress: params.ipAddress || null,
    },
  })
}
