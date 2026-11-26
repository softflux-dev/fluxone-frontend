import { useCallback, useEffect, useState } from 'react'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogCancelButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableGroupHead,
  TableSubHead,
} from '@/components/ui/table'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { displayItemCode } from '@/lib/formatDisplayId'
import { mapProduct, PRODUCT_STATUS } from '@/lib/products/mapProduct'
import { formatShelfQuantity, getShelfStockStatus } from '@/lib/products/shelfStockStatus'
import { variantSkuLabel } from '@/lib/products/variantDisplay'
import { useCurrency } from '@/hooks/shared/useCurrency'
import { getPricingBreakdown, formatMoney } from '@/lib/products/pricingBreakdown'

async function fetchProductWithVariants(productId) {
  const res = await apiClient.get(endpoints.products.detail(productId))
  if (!res.success) return { success: false, error: res.error || 'Failed to load variants' }
  return { success: true, data: mapProduct(res.data) }
}

// Same wording as the Inventory Monitoring table: In Stock / Low Stock / Out of Stock.
// Colors still come from getShelfStockStatus; only the label is normalized.
function stockStatusFor(sku) {
  const base = getShelfStockStatus(sku.quantity, sku.reorderPoint)
  const qty = Number(sku.quantity) || 0
  const raw = String(base?.label || '').toLowerCase()

  let label = 'In Stock'
  if (qty <= 0 || raw.includes('out')) label = 'Out of Stock'
  else if (raw.includes('low') || raw.includes('limit')) label = 'Low Stock'

  return { ...base, label }
}

/**
 * BM shelf: list each variant SKU with stock and pricing.
 * Same columns as the Inventory Monitoring table. Read-only (no actions).
 * `categories` (optional): the page's category list, used to show category names.
 */
export function BranchVariantStockDialog({
  open,
  product = null,
  categories = [],
  onOpenChange,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null)
  const { currency } = useCurrency()

  const load = useCallback(async () => {
    if (!open || !product?.id) return
    setLoading(true)
    setError(null)
    setDetail(null)
    const result = await fetchProductWithVariants(product.id)
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setDetail(result.data)
  }, [open, product?.id])

  useEffect(() => {
    void load()
  }, [load])

  const variants = Array.isArray(detail?.variants) ? detail.variants : []
  const parentImage = detail?.imageUrl || product?.imageUrl || null
  const titleName = detail?.name || product?.name || 'Product'
  const totalUnits = variants.reduce((sum, sku) => sum + (Number(sku.quantity) || 0), 0)

  const nameOf = (id) => (id ? categories.find((c) => c.id === id)?.name || '' : '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-[96vw] flex-col sm:max-w-5xl md:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8 text-left">
            <ProductImageCell src={parentImage} name={titleName} />
            <div className="min-w-0">
              <DialogTitle className="truncate text-lg font-bold text-slate-900">
                {titleName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {loading
                  ? 'Loading variants…'
                  : `Currency: ${currency} · ${totalUnits.toLocaleString()} units · ${variants.length} variant${variants.length === 1 ? '' : 's'}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <TableRowsSkeleton rows={4} />
          ) : error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : variants.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No variant SKUs found for this product.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table className="w-full min-w-[62rem] text-left text-sm">
                <TableHeader>
                  <TableRow className="text-xs uppercase text-slate-500">
                    <TableHead rowSpan={2} className="w-14 px-2 py-3 align-middle whitespace-nowrap">Image</TableHead>
                    <TableHead rowSpan={2} className="w-[9rem] px-2 py-3 align-middle whitespace-nowrap">Name</TableHead>
                    <TableHead rowSpan={2} className="w-[7rem] px-2 py-3 align-middle whitespace-nowrap">Category</TableHead>
                    <TableHead rowSpan={2} className="w-[7rem] px-2 py-3 align-middle whitespace-nowrap">In Stock</TableHead>
                    <TableHead rowSpan={2} className="w-[6.5rem] px-2 py-3 align-middle whitespace-nowrap">Status</TableHead>
                    <TableGroupHead colSpan={6}>Price</TableGroupHead>
                  </TableRow>
                  <TableRow className="text-xs uppercase text-slate-500">
                    <TableSubHead className="w-[5rem]">Purchase</TableSubHead>
                    <TableSubHead className="w-[5rem]">Selling</TableSubHead>
                    <TableSubHead className="w-[4rem]">Tax %</TableSubHead>
                    <TableSubHead className="w-[5rem]">Discount %</TableSubHead>
                    <TableSubHead className="w-[5rem]">Final</TableSubHead>
                    <TableSubHead className="w-[4rem]">Profit %</TableSubHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((sku) => {
                    const label = variantSkuLabel(sku)
                    const stock = formatShelfQuantity(sku.quantity)
                    const status = stockStatusFor(sku)
                    const inactive = sku.status === PRODUCT_STATUS.INACTIVE
                    const pricing = getPricingBreakdown(sku)
                    const cat = nameOf(sku.categoryId || detail?.categoryId)
                    const subcat = nameOf(sku.subcategoryId || detail?.subcategoryId)

                    return (
                      <TableRow key={sku.id} className={inactive ? 'opacity-60' : ''}>
                        <TableCell className="px-2 py-3">
                          <ProductImageCell src={sku.imageUrl || parentImage} name={label} />
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <span className="inline-block whitespace-nowrap rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900">
                            {label}
                          </span>
                          <div className="mt-1 truncate font-mono text-[10px] text-slate-400">
                            Item code: {displayItemCode(sku)}
                          </div>
                          {inactive ? (
                            <p className="text-[11px] font-medium text-slate-400">Inactive</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="overflow-hidden px-2 py-3 text-slate-600">
                          <CategoryLines
                            category={cat}
                            subcategory={subcat}
                            emptyLabel="—"
                          />
                        </TableCell>
                        <TableCell className="px-2 py-3 font-mono font-bold whitespace-nowrap text-slate-900">
                          {stock.display}
                        </TableCell>
                        <TableCell className="px-2 py-3">
                          <Badge variant={status.variant} className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="px-2 py-3 font-mono text-xs">
                          {formatMoney(pricing.purchase)}
                        </TableCell>
                        <TableCell className="px-2 py-3 font-mono text-xs">
                          {formatMoney(pricing.selling)}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-xs">{pricing.taxPct}%</TableCell>
                        <TableCell className="px-2 py-3 text-xs">{pricing.discountPct}%</TableCell>
                        <TableCell className="px-2 py-3 font-mono text-xs font-bold">
                          {formatMoney(pricing.final)}
                        </TableCell>
                        <TableCell className="px-2 py-3 text-xs">{pricing.profitPct}%</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 sm:justify-end">
          <DialogCancelButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BranchVariantStockDialog