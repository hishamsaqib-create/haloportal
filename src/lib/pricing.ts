import { prisma } from './prisma'

/**
 * Resolve price for a product with override chain:
 * Dentist override > Clinic override > Default product price
 */
export async function resolvePrice(
  productId: string,
  clinicId: string,
  dentistId: string
): Promise<number> {
  // Check dentist-level override first
  const dentistRule = await prisma.pricingRule.findFirst({
    where: { productId, dentistId },
  })
  if (dentistRule) return dentistRule.price

  // Check clinic-level override
  const clinicRule = await prisma.pricingRule.findFirst({
    where: { productId, clinicId, dentistId: null },
  })
  if (clinicRule) return clinicRule.price

  // Fall back to base price
  const product = await prisma.product.findUnique({
    where: { id: productId },
  })
  return product?.basePrice ?? 0
}

/**
 * Calculate line total for a case item
 * Handles tooth count multipliers
 */
export function calculateLineTotal(
  unitPrice: number,
  qty: number,
  toothNumbers?: string | null
): number {
  const toothCount = toothNumbers ? parseToothNumbers(toothNumbers).length : 1
  return unitPrice * qty * toothCount
}

export function parseToothNumbers(json: string | null | undefined): number[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}
