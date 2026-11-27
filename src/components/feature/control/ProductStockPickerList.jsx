import { Package } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ProductImageCell } from '@/components/feature/products/ProductStatusToggle'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import { money, PRODUCT_TYPES } from '@/lib/products/mapProduct'
import { cn } from '@/lib/utils'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

function productLabel(product) {
  return product.productName || product.name || 'Item'
}

// One-line row: Select · Image · Name · Purchase · Selling · Qty
export function ProductStockPickerList({
  products = [],
  selected = {},
  onToggle,
  onLineChange,
  bundleInfo = {},
  loading = false,
  className,
}) {
  const list = Array.isArray(products) ? products : []

  if (loading) {
    return <TableRowsSkeleton rows={4} className={className} />
  }

  if (!list.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-slate-500">
        No products match these filters.
      </p>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-white">
        {list.map((product) => {
          const isParentVariant = product.type === PRODUCT_TYPES.VARIANT
          if (isParentVariant) return null
          const line = selected[product.id]
          const checked = Boolean(line)
          const name = productLabel(product)
          const isBundle = product.type === PRODUCT_TYPES.BUNDLE
          const info = bundleInfo[product.id]

          return (
            <div
              key={product.id}
              className={cn(
                'flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 last:border-b-0',
                checked ? 'bg-purple-50/40' : 'hover:bg-slate-50/80',
              )}
            >
              <Checkbox
                checked={checked}
                onChange={() => onToggle?.(product)}
                aria-label={`Select ${name}`}
                className="shrink-0"
              />

              <ProductImageCell src={product.imageUrl} name={name} />

              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900" title={name}>
                {name}
              </p>

              {checked ? (
                <div className="flex shrink-0 items-end gap-2">
                  <div className="w-[4.5rem] space-y-0.5">
                    <Label className="text-[10px] text-slate-400">Purchase</Label>
                    <WholeNumberInput
                      value={line.purchasePrice ?? ''}
                      placeholder={money(product.purchasePrice)}
                      className="h-8 w-full"
                      onChange={(e) =>
                        onLineChange?.(product.id, { purchasePrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-[4.5rem] space-y-0.5">
                    <Label className="text-[10px] text-slate-400">Selling</Label>
                    <WholeNumberInput
                      value={line.sellingPrice ?? ''}
                      placeholder={money(product.sellingPrice)}
                      className="h-8 w-full"
                      onChange={(e) =>
                        onLineChange?.(product.id, { sellingPrice: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-14 space-y-0.5">
                    <Label className="text-[10px] text-slate-400">Qty</Label>
                    <WholeNumberInput
                      min={1}
                      max={isBundle && info ? info.max : undefined}
                      value={line.quantity ?? '1'}
                      className="h-8 w-full"
                      onChange={(e) => onLineChange?.(product.id, { quantity: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}

              {checked && isBundle ? (
                <div className="w-full rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {info ? (
                    <>
                      <p className={cn('font-semibold', info.max > 0 ? 'text-emerald-700' : 'text-red-600')}>
                        {info.max > 0
                          ? `Maximum you can add: ${info.max} bundle(s)`
                          : 'Cannot add: a component is out of stock'}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {info.items.map((c) => (
                          <li key={c.itemId} className="flex justify-between gap-2">
                            <span className="truncate">
                              {c.name} · {c.need} per bundle
                            </span>
                            <span className={cn('shrink-0', c.canMake === info.max && 'font-semibold text-amber-700')}>
                              {c.have} in stock → {c.canMake} bundle(s)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p>Checking component stock…</p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Package className="size-3.5 shrink-0" />
        {/* Bundles assemble on Stock In — component qty is deducted server-side */}
        Choose individual items, bundles, or variant SKUs. Bundle stock-in deducts recipe
        components. Previous prices show as placeholders.
      </p>
    </div>
  )
}

export default ProductStockPickerList
