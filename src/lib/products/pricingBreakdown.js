import { finalPriceFromSelling } from '@/lib/products/pricing'

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// Mirrors Admin Tax & Profit (finalPriceFromSelling): Final is derived from the
// stored selling_price, not purchase × (1 + profit%). profit% is display-only.
export function getPricingBreakdown(item) {
  const purchase = num(item?.purchasePrice)
  const selling = num(item?.sellingPrice)
  const profitPct = num(item?.profitPercent)
  // Match Admin (tax-profit.model.js): COALESCE(discount_percent, offer_percent, 0).
  const discountPct = num(item?.discountPercent ?? item?.offerPercent)
  const taxPct = num(item?.taxPercent)

  const discounted = selling * (1 - discountPct / 100)
  const taxAmount = discounted * (taxPct / 100)
  const final = finalPriceFromSelling(selling, discountPct, taxPct)

  return {
    purchase: round2(purchase),
    profitPct,
    selling: round2(selling),
    discountPct,
    discounted: round2(discounted),
    taxPct,
    taxAmount: round2(taxAmount),
    final,
  }
}

export const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })