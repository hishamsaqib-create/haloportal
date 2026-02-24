import { prisma } from './prisma'

/**
 * Resolved pricing info including per-tooth pricing details
 */
export interface ResolvedPrice {
  price: number
  minTeeth: number | null
  additionalToothPrice: number | null
}

/**
 * Resolve price for a product with override chain:
 * Dentist pricing variation > Dentist override > Clinic override > Default product price
 * Returns base price along with per-tooth pricing configuration
 */
export async function resolvePrice(
  productId: string,
  clinicId: string,
  dentistId: string
): Promise<ResolvedPrice> {
  // Check if dentist has a pricing variation assigned
  const dentist = await prisma.dentist.findUnique({
    where: { id: dentistId },
    select: { pricingVariationId: true },
  })

  // If dentist has a pricing variation, look for a matching rule by variationName
  if (dentist?.pricingVariationId) {
    const variationRule = await prisma.pricingRule.findFirst({
      where: { productId, id: dentist.pricingVariationId },
    })
    if (variationRule) {
      return {
        price: variationRule.price,
        minTeeth: variationRule.minTeeth,
        additionalToothPrice: variationRule.additionalToothPrice,
      }
    }
  }

  // Check dentist-level override
  const dentistRule = await prisma.pricingRule.findFirst({
    where: { productId, dentistId },
  })
  if (dentistRule) {
    return {
      price: dentistRule.price,
      minTeeth: dentistRule.minTeeth,
      additionalToothPrice: dentistRule.additionalToothPrice,
    }
  }

  // Check clinic-level override
  const clinicRule = await prisma.pricingRule.findFirst({
    where: { productId, clinicId, dentistId: null },
  })
  if (clinicRule) {
    return {
      price: clinicRule.price,
      minTeeth: clinicRule.minTeeth,
      additionalToothPrice: clinicRule.additionalToothPrice,
    }
  }

  // Fall back to base product price
  const product = await prisma.product.findUnique({
    where: { id: productId },
  })
  return {
    price: product?.basePrice ?? 0,
    minTeeth: product?.minTeeth ?? null,
    additionalToothPrice: product?.additionalToothPrice ?? null,
  }
}

/**
 * Calculate the per-tooth price adjustment.
 * Base price covers up to minTeeth. Each tooth above minTeeth costs additionalToothPrice.
 * Returns the total price including per-tooth additions.
 */
export function calculatePerToothPrice(
  basePrice: number,
  toothCount: number,
  minTeeth: number,
  additionalToothPrice: number
): number {
  if (toothCount <= minTeeth) return basePrice
  const extraTeeth = toothCount - minTeeth
  return basePrice + extraTeeth * additionalToothPrice
}

/**
 * Calculate line total for a case item.
 * Incorporates per-tooth pricing when minTeeth and additionalToothPrice are provided.
 * If per-tooth pricing is not configured, falls back to simple unit * qty * toothCount.
 */
export function calculateLineTotal(
  unitPrice: number,
  qty: number,
  toothNumbers?: string | null,
  minTeeth?: number | null,
  additionalToothPrice?: number | null
): number {
  const toothCount = toothNumbers ? parseToothNumbers(toothNumbers).length : 1

  // If per-tooth pricing is configured, use it
  if (minTeeth != null && additionalToothPrice != null && minTeeth > 0) {
    const perToothTotal = calculatePerToothPrice(unitPrice, toothCount, minTeeth, additionalToothPrice)
    return perToothTotal * qty
  }

  // Default: simple multiplication
  return unitPrice * qty * toothCount
}

export function parseToothNumbers(json: string | null | undefined): (string | number)[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((n): n is string | number => typeof n === 'number' || typeof n === 'string') : []
  } catch {
    return []
  }
}
