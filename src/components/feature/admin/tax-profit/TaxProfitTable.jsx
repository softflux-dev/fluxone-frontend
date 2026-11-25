import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableGroupHead,
  TableSubHead,
  TablePagination,
} from '@/components/ui/table'
import { BRAND, UI_RADIUS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  actualMarginAmount,
  actualMarginPercent,
  finalPriceFromSelling,
} from '@/lib/products/pricing'
import {
  ADMIN_PRICING_LEGEND,
  FINAL_PRICE_FORMULA,
  MARGIN_FORMULA,
  PROFIT_PCT_FORMULA,
  PURCHASE_COST_FORMULA,
  SELLING_PRICE_FORMULA,
  TAX_PCT_FORMULA,
} from '@/lib/products/pricingFormulaCopy'
import { BadgePercent, PackageOpen, Receipt } from 'lucide-react'
import { TableRowsSkeleton } from '@/components/ui/skeleton'

function priceGroupSpan(v) {
  return (
    (v.baseCost ? 1 : 0) +
    (v.sellingPrice ? 1 : 0) +
    (v.tax ? 2 : 0) +
    (v.finalPrice ? 2 : 0) + // Discount % + Final
    (v.profit ? 2 : 0)
  )
}

function resolveRowPricing(p) {
  const sellingPrice = Number(p.sellingPrice ?? 0)
  const discountPercent = Number(p.discountPercent ?? 0)
  const taxPct = Number(p.taxPct ?? 0)
  const baseCost = Number(p.baseCost ?? 0)
  const finalPrice =
    p.finalPrice ?? finalPriceFromSelling(sellingPrice, discountPercent, taxPct)
  const marginAmount =
    p.marginAmount ?? actualMarginAmount(baseCost, sellingPrice)
  const marginPercent =
    p.marginPercent ?? actualMarginPercent(baseCost, sellingPrice)
  const profitAmount = p.profitAmount ?? Math.round((finalPrice - baseCost) * 100) / 100
  const discountPct = discountPercent
  const profitPercent = p.profitPercent ?? (baseCost > 0 ? Math.round((profitAmount / baseCost) * 10000) / 100 : 0)
  return { discountPct, sellingPrice, finalPrice, marginAmount, marginPercent, baseCost, profitAmount, profitPercent }
}

export function TaxProfitTable({
  currency,
  formatPlain,
  products,
  loading,
  mutating,
  hasFilters,
  selectedCount,
  isRowSelected,
  onToggleRow,
  allVisibleSelected,
  someVisibleSelected,
  onToggleAllMatching,
  visibleColumns,
  pagination,
  page,
  limit,
  setPage,
  setLimit,
  onOpenProfitDialog,
  onOpenTaxDialog,
}) {
  return (
    <SurfaceCard
      title="Catalog Pricing & Profit Margins"
      description={`Currency: ${currency}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 && (
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-900 border-purple-200 text-xs font-bold px-2.5 py-1"
            >
              {selectedCount} Selected
            </Badge>
          )}
          <Button
            type="button"
            disabled={selectedCount === 0 || mutating}
            onClick={onOpenProfitDialog}
            size="sm"
            className={cn(
              'h-9 px-3.5 text-xs font-bold cursor-pointer text-white disabled:opacity-40 shadow-xs',
              UI_RADIUS,
            )}
            style={{ background: BRAND.purple }}
          >
            <BadgePercent className="mr-1.5 size-3.5" />
            Set Profit %
          </Button>
          <Button
            type="button"
            disabled={selectedCount === 0 || mutating}
            onClick={onOpenTaxDialog}
            size="sm"
            className={cn(
              'h-9 px-3.5 text-xs font-bold cursor-pointer text-white disabled:opacity-40 shadow-xs',
              UI_RADIUS,
            )}
            style={{ background: BRAND.deep }}
          >
            <Receipt className="mr-1.5 size-3.5" />
            Set Tax %
          </Button>
        </div>
      }
    >
      {loading && products.length === 0 ? (
        <TableRowsSkeleton rows={5} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={
            hasFilters
              ? 'No products match these filters'
              : 'No products in this company yet'
          }
          description={
            hasFilters
              ? 'Clear search or filters to see more of the catalog.'
              : 'Create products from a branch Inventory Manager catalog first. Tax & Profit will list them here for bulk margin and tax updates.'
          }
          compact
        />
      ) : (
        <>
          <div className="mb-3">
            <details className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px] leading-relaxed text-slate-500 group">
              <summary className="cursor-pointer select-none font-semibold text-slate-700 focus:outline-none flex items-center gap-1">
                <span>
                  {/** eye icon or chevron could be added here for clarity **/}
                  {/** "View" and "Hide" label can be dynamic if you want, here's a basic toggle */}
                  <span className="group-open:hidden">View details</span>
                  <span className="hidden group-open:inline">Hide details</span>
                </span>
              </summary>
              <div className="mt-2">
                <span className="font-semibold text-slate-700">Formulas: </span> <br />
                {FINAL_PRICE_FORMULA}. <br />
                {MARGIN_FORMULA}. <br />
                {PROFIT_PCT_FORMULA}. <br />
                {TAX_PCT_FORMULA}. <br />
                {SELLING_PRICE_FORMULA}. <br />
                {PURCHASE_COST_FORMULA}.
              </div>
            </details>
          </div>
     

          <div className="space-y-3 md:hidden">
            {products.map((p) => {
              const isChecked = !!isRowSelected?.(p.id)
              const { sellingPrice, finalPrice, profitAmount, profitPercent, baseCost } =
                resolveRowPricing(p)

              return (
                <article
                  key={p.id}
                  className={`rounded-xl border px-3 py-3 ${
                    isChecked
                      ? 'border-purple-200 bg-purple-50/40'
                      : 'border-border bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected
                    }}
                    onChange={() => onToggleAllMatching?.(!allVisibleSelected)}
                    aria-label="Select all matching filtered rows"
                  />
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="size-10 shrink-0 rounded-lg border border-slate-200 object-cover shadow-2xs"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {p.variantLabel ? `${p.name} (${p.variantLabel})` : p.name}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">
                        {p.itemCode || p.id}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        <CategoryLines
                          category={p.category}
                          subcategory={p.subcategory}
                          categoryClassName="font-medium text-slate-600"
                          subcategoryClassName="text-[11px] text-slate-400"
                        />
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700"
                          title={PROFIT_PCT_FORMULA}
                          aria-label={`Profit ${profitPercent} percent`}
                        >
                          {profitPercent}%
                        </span>
                        <span
                          className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700"
                          title={TAX_PCT_FORMULA}
                          aria-label={`Tax ${p.taxPct > 0 ? `${p.taxPct} percent` : 'exempt'}`}
                        >
                          {p.taxPct > 0 ? `${p.taxPct}%` : '0% (Exempt)'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                        <p>
                          Purchase{' '}
                          <span className="font-medium text-slate-600">
                            {formatPlain(baseCost)}
                          </span>
                        </p>
                        <p>
                          Selling{' '}
                          <span className="font-medium text-slate-600">
                            {formatPlain(sellingPrice)}
                          </span>
                        </p>
                      </div>
                      <div className="mt-1 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-slate-400" title={FINAL_PRICE_FORMULA}>
                            Final (incl. tax)
                          </p>
                          <p className="text-sm font-extrabold text-purple-950">
                            {formatPlain(finalPrice)}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400" title={MARGIN_FORMULA}>
                          Profit {formatPlain(profitAmount)} ({profitPercent}%) · Sold {p.unitsSold ?? 0} · Rev {formatPlain(p.totalRevenue ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[56rem] text-left text-sm">
              <TableHeader>
                <TableRow className="text-xs text-slate-500 uppercase">
                  <TableHead rowSpan={2} className="w-10 px-3 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected
                      }}
                      onChange={() => onToggleAllMatching?.(!allVisibleSelected)}
                      className="rounded text-purple-600 focus:ring-0"
                    />
                  </TableHead>
                  {visibleColumns.id && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">SKU ID</TableHead>
                  )}
                  {visibleColumns.image && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">Image</TableHead>
                  )}
                  {visibleColumns.name && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">Product</TableHead>
                  )}
                  {visibleColumns.barcode && (
                    <TableHead rowSpan={2} className="hidden px-3 py-3 align-middle font-medium lg:table-cell">
                      Barcode
                    </TableHead>
                  )}
                  {visibleColumns.category && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">Category</TableHead>
                  )}
                  {priceGroupSpan(visibleColumns) > 0 && (
                    <TableGroupHead colSpan={priceGroupSpan(visibleColumns)}>
                      Price
                    </TableGroupHead>
                  )}
                  {visibleColumns.unitsSold && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">
                      Units Sold
                    </TableHead>
                  )}
                  {visibleColumns.totalRevenue && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">
                      Revenue
                    </TableHead>
                  )}
                  {visibleColumns.totalProfit && (
                    <TableHead rowSpan={2} className="px-3 py-3 align-middle font-medium">
                      Total Profit
                    </TableHead>
                  )}
                </TableRow>
                <TableRow className="text-xs text-slate-500 uppercase">
                  {visibleColumns.baseCost && (
                    <TableSubHead title={PURCHASE_COST_FORMULA}>Purchase</TableSubHead>
                  )}
                  {visibleColumns.sellingPrice && (
                    <TableSubHead title={SELLING_PRICE_FORMULA}>Selling</TableSubHead>
                  )}
                  {visibleColumns.tax && (
                    <>
                      <TableSubHead title={TAX_PCT_FORMULA}>Tax %</TableSubHead>
                      <TableSubHead title={TAX_PCT_FORMULA}>Tax</TableSubHead>
                    </>
                  )}
                  {visibleColumns.finalPrice && (
                    <>
                      <TableSubHead>Discount %</TableSubHead>
                      <TableSubHead title={FINAL_PRICE_FORMULA}>Final</TableSubHead>
                    </>
                  )}
                  {visibleColumns.profit && (
                    <>
                      <TableSubHead title={PROFIT_PCT_FORMULA}>Profit %</TableSubHead>
                      <TableSubHead title={MARGIN_FORMULA}>Profit</TableSubHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const isChecked = !!isRowSelected?.(p.id)
                  const { discountPct, sellingPrice, finalPrice, profitAmount, profitPercent, baseCost } =
                    resolveRowPricing(p)

                  return (
                    <TableRow
                      key={p.id}
                      className={`group hover:bg-slate-50/70 transition-colors ${
                        isChecked ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      <TableCell className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleRow(p.id)}
                          className="rounded text-purple-600 focus:ring-0"
                        />
                      </TableCell>

                      {visibleColumns.id && (
                        <TableCell className="px-3 py-3 font-mono text-xs font-bold text-slate-700">
                          {p.itemCode || p.id}
                        </TableCell>
                      )}

                      {visibleColumns.image && (
                        <TableCell className="px-3 py-3">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="size-10 rounded-lg object-cover border border-slate-200 shadow-2xs"
                            />
                          ) : (
                            <div className="size-10 rounded-lg border border-dashed border-slate-200 bg-slate-50" />
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.name && (
                        <TableCell className="px-3 py-3 font-bold text-slate-900 text-xs">
                          {p.variantLabel ? `${p.name} (${p.variantLabel})` : p.name}
                        </TableCell>
                      )}

                      {visibleColumns.barcode && (
                        <TableCell className="hidden px-3 py-3 font-mono text-xs text-slate-500 lg:table-cell">
                          {p.barcode || '—'}
                        </TableCell>
                      )}

                      {visibleColumns.category && (
                        <TableCell className="px-3 py-3 text-xs text-slate-600">
                          <CategoryLines
                            category={p.category}
                            subcategory={p.subcategory}
                          />
                        </TableCell>
                      )}

                      {visibleColumns.baseCost && (
                        <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                          {formatPlain(baseCost)}
                        </TableCell>
                      )}

                      {visibleColumns.sellingPrice && (
                        <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                          {formatPlain(sellingPrice)}
                        </TableCell>
                      )}

                      {visibleColumns.tax && (
                        <>
                          <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                            {`${p.taxPct ?? 0}%`}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                            {formatPlain(p.taxAmount ?? 0)}
                          </TableCell>
                        </>
                      )}

                      {visibleColumns.finalPrice && (
                        <>
                          <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                            {`${discountPct}%`}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-sm font-extrabold text-purple-950">
                            {formatPlain(finalPrice)}
                          </TableCell>
                        </>
                      )}

                      {visibleColumns.profit && (
                        <>
                          <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                            {`${profitPercent}%`}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                            {formatPlain(profitAmount)}
                          </TableCell>
                        </>
                      )}

                      {visibleColumns.unitsSold && (
                        <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                          {p.unitsSold ?? 0}
                        </TableCell>
                      )}

                      {visibleColumns.totalRevenue && (
                        <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                          {formatPlain(p.totalRevenue ?? 0)}
                        </TableCell>
                      )}

                      {visibleColumns.totalProfit && (
                        <TableCell className="px-3 py-3 text-xs font-semibold text-slate-800">
                          {formatPlain(p.totalProfit ?? 0)}
                        </TableCell>
                      )}

                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={pagination.page || page}
            pageCount={pagination.pageCount || 1}
            totalItems={pagination.total || 0}
            pageSize={limit}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next)
              setPage(1)
            }}
          />
        </>
      )}
    </SurfaceCard>
  )
}
