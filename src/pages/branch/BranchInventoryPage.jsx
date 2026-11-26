import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Settings2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { ProductCatalogFilters } from '@/components/shared/ProductCatalogFilters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableGroupHead,
  TableSubHead,
  TableRow,
  TableCell,
  TablePagination,
} from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/shared/useDebouncedValue'
import { useBranchInventoryCatalog } from '@/hooks/branch/useBranchInventoryCatalog'
import { useClientPagination } from '@/hooks/shared/useClientPagination'
import { displayItemCode } from '@/lib/formatDisplayId'
import { CategoryLines } from '@/components/shared/CategoryLines'
import { TruncatedText } from '@/components/shared/TruncatedText'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { getShelfStockStatus } from '@/lib/products/shelfStockStatus'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { StockControlPriceDialog } from '@/components/feature/branch/inventory/StockControlPriceDialog'
import { BranchVariantStockDialog } from '@/components/feature/branch/inventory/BranchVariantStockDialog'
import {
  isVariantParent,
  ShelfStockCell,
} from '@/components/feature/branch/inventory/ShelfStockCell'
import { DemandRequestsPanel } from '@/components/feature/branch/demand-requests/DemandRequestsPanel'
import { getPricingBreakdown, formatMoney } from '@/lib/products/pricingBreakdown'
import { useCurrency } from '@/hooks/shared/useCurrency'

const INVENTORY_TABS = [
  { id: 'stock', label: 'Stock Overview' },
  { id: 'demand', label: 'Demand Requests' },
]

// Status badge with exactly three labels: In Stock / Low Stock / Out of Stock.
// Colors still come from getShelfStockStatus; only the wording is normalized.
function stockStatusFor(prod) {
  const base = getShelfStockStatus(prod.quantity, prod.reorderPoint)
  const qty = Number(prod.quantity) || 0
  const raw = String(base?.label || '').toLowerCase()

  let label = 'In Stock'
  if (qty <= 0 || raw.includes('out')) label = 'Out of Stock'
  else if (raw.includes('low') || raw.includes('limit')) label = 'Low Stock'

  return { ...base, label }
}

export function BranchInventoryPage() {
  const { currency } = useCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') === 'demand' ? 'demand' : 'stock'
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const { products, categories, loading, fetchInventory, fetchCategories } =
    useBranchInventoryCatalog()
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
    slice: pagedProducts,
  } = useClientPagination(products)

  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQ = useDebouncedValue(searchQuery, 300)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterVariantType, setFilterVariantType] = useState('')
  const [filterVariantValue, setFilterVariantValue] = useState('')
  const subcategories = categories.filter((c) => !!c.parentId)

  const [priceRuleOpen, setPriceRuleOpen] = useState(false)
  const [variantsTarget, setVariantsTarget] = useState(null)

  useEffect(() => {
    const params = { limit: 100, status: 'active' }
    if (debouncedQ.trim()) params.q = debouncedQ.trim()
    if (filterCategory) params.categoryId = filterCategory
    if (filterSubcategory) params.subcategoryId = filterSubcategory
    if (filterProduct) params.productId = filterProduct
    if (filterVariantType) params.variantTypeId = filterVariantType
    if (filterVariantValue) params.variantValueId = filterVariantValue
    void fetchInventory(params)
  }, [
    fetchInventory,
    debouncedQ,
    filterCategory,
    filterSubcategory,
    filterProduct,
    filterVariantType,
    filterVariantValue,
  ])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  // Notification deep-link: ?tab=demand&highlight=…
  useEffect(() => {
    if (tabFromUrl !== activeTab) setActiveTab(tabFromUrl)
  }, [tabFromUrl, activeTab])

  function selectTab(id) {
    setActiveTab(id)
    const next = new URLSearchParams(searchParams)
    if (id === 'demand') next.set('tab', 'demand')
    else {
      next.delete('tab')
      next.delete('highlight')
    }
    setSearchParams(next, { replace: true })
  }

  // Used by the variant stock dialog to jump to Demand Requests
  function openDemandRequests() {
    setVariantsTarget(null)
    selectTab('demand')
  }

  useEffect(() => {
    setPage(1)
  }, [
    debouncedQ,
    filterCategory,
    filterSubcategory,
    filterProduct,
    filterVariantType,
    filterVariantValue,
  ])

  const handleCatalogChange = (patch = {}) => {
    if ('categoryId' in patch) setFilterCategory(patch.categoryId || '')
    if ('subcategoryId' in patch) setFilterSubcategory(patch.subcategoryId || '')
    if ('productId' in patch) setFilterProduct(patch.productId || '')
    if ('variantTypeId' in patch) setFilterVariantType(patch.variantTypeId || '')
    if ('variantValueId' in patch) setFilterVariantValue(patch.variantValueId || '')
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterCategory('')
    setFilterSubcategory('')
    setFilterProduct('')
    setFilterVariantType('')
    setFilterVariantValue('')
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Roster Inventory"
          title="Inventory Monitoring"
          description={
            activeTab === 'demand'
              ? 'Review Inventory Manager order requests — edit, approve, or reject.'
              : 'Monitor shelf stock levels and pricing.'
          }
          actions={
            activeTab === 'stock' ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={() => setPriceRuleOpen(true)}>
                  <Settings2 className="size-4" />
                  Stock Control Price
                </Button>
              </div>
            ) : null
          }
        />
      </MotionHeader>

      <div className="flex flex-wrap items-center gap-2">
        {INVENTORY_TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={cn(
                'cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97] sm:px-5 sm:py-2.5 sm:text-sm',
                active
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-border bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              )}
              style={active ? { background: BRAND.purple } : undefined}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'demand' ? <DemandRequestsPanel /> : null}

      {activeTab === 'stock' ? (
        <>
          <StockControlPriceDialog open={priceRuleOpen} onOpenChange={setPriceRuleOpen} />

          <MotionReveal delay={0.02}>
            <ProductCatalogFilters
              searchId="stock-search"
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Item name or item code…"
              categories={categories}
              categoryId={filterCategory}
              subcategoryId={filterSubcategory}
              productId={filterProduct}
              variantTypeId={filterVariantType}
              variantValueId={filterVariantValue}
              onChange={handleCatalogChange}
              onClear={handleClearFilters}
            />
          </MotionReveal>

          <MotionReveal delay={0.04}>
            <SurfaceCard
              title="Shelf Stock Levels"
              description={`Currency: ${currency}`}
              className="min-h-[400px]"
            >
              {loading ? (
                <TableRowsSkeleton rows={5} />
              ) : products.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No stock products found</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {pagedProducts.map((prod) => {
                      const variantParent = isVariantParent(prod)
                      const status = variantParent ? null : stockStatusFor(prod)
                      const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                      const subcat =
                        subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                      const pricing = variantParent ? null : getPricingBreakdown(prod)

                      return (
                        <article
                          key={prod.id}
                          className="rounded-xl border border-border bg-slate-50/60 px-3 py-3"
                        >
                          <div className="flex items-start gap-3">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="size-12 shrink-0 rounded-lg border border-slate-100 object-cover"
                              />
                            ) : (
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                N/A
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <TruncatedText
                                    text={prod.name}
                                    maxChars={10}
                                    className="text-sm font-bold text-slate-900"
                                  />
                                  <p className="font-mono text-[11px] text-slate-400">
                                    Item code: {displayItemCode(prod)}
                                  </p>
                                </div>
                                {status ? (
                                  <Badge
                                    variant={status.variant}
                                    className={`shrink-0 ${status.className}`}
                                  >
                                    {status.label}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 border-violet-200 bg-violet-50 text-violet-700"
                                  >
                                    Variant
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1.5 text-xs text-slate-500">
                                <CategoryLines
                                  category={cat !== '—' ? cat : ''}
                                  subcategory={subcat !== '—' ? subcat : ''}
                                  emptyLabel="—"
                                  categoryClassName="font-medium text-slate-600"
                                  subcategoryClassName="text-[11px] text-slate-400"
                                />
                              </div>
                              <div className="mt-2">
                                <ShelfStockCell
                                  product={prod}
                                  onViewVariants={setVariantsTarget}
                                />
                              </div>

                              {pricing ? (
                                <p className="mt-2 text-xs text-slate-500">
                                  Final:{' '}
                                  <b className="font-mono text-slate-900">
                                    {formatMoney(pricing.final)}
                                  </b>
                                  <span className="ml-1 text-slate-400">
                                    · Disc {pricing.discountPct}%
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <Table className="w-full min-w-[62rem] table-fixed text-left text-sm">
                      <TableHeader>
                        <TableRow className="text-xs text-slate-500 uppercase">
                          <TableHead rowSpan={2} className="w-14 px-2 py-3 align-middle whitespace-nowrap">Image</TableHead>
                          <TableHead rowSpan={2} className="w-[8rem] px-2 py-3 align-middle whitespace-nowrap">Name</TableHead>
                          <TableHead rowSpan={2} className="w-[7rem] px-2 py-3 align-middle whitespace-nowrap">Category</TableHead>
                          <TableHead rowSpan={2} className="w-[10rem] px-2 py-3 align-middle whitespace-nowrap">In Stock</TableHead>
                          <TableHead rowSpan={2} className="w-[6.5rem] px-2 py-3 align-middle whitespace-nowrap">Status</TableHead>
                          <TableGroupHead colSpan={6}>Price</TableGroupHead>
                        </TableRow>
                        <TableRow className="text-xs text-slate-500 uppercase">
                          <TableSubHead className="w-[5rem]">Purchase</TableSubHead>
                          <TableSubHead className="w-[5rem]">Selling</TableSubHead>
                          <TableSubHead className="w-[4rem]">Tax %</TableSubHead>
                          <TableSubHead className="w-[5rem]">Discount %</TableSubHead>
                          <TableSubHead className="w-[5rem]">Final</TableSubHead>
                          <TableSubHead className="w-[4rem]">Profit %</TableSubHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedProducts.map((prod) => {
                          const variantParent = isVariantParent(prod)
                          const status = variantParent ? null : stockStatusFor(prod)
                          const cat = categories.find((c) => c.id === prod.categoryId)?.name || '—'
                          const subcat =
                            subcategories.find((s) => s.id === prod.subcategoryId)?.name || '—'

                          const pricing = variantParent ? null : getPricingBreakdown(prod)

                          return (
                            <TableRow key={prod.id} className="group">
                              <TableCell className="px-2 py-3">
                                {prod.imageUrl ? (
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="size-10 rounded-lg border border-slate-100 object-cover"
                                  />
                                ) : (
                                  <div className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                    N/A
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[10rem] overflow-hidden px-2 py-3">
                                <TruncatedText
                                  text={prod.name}
                                  maxChars={10}
                                  className="font-bold text-slate-900"
                                />
                                <div className="truncate font-mono text-[10px] text-slate-400">
                                  Item code: {displayItemCode(prod)}
                                </div>
                              </TableCell>
                              <TableCell className="overflow-hidden px-2 py-3 text-slate-600">
                                <CategoryLines
                                  category={cat !== '—' ? cat : ''}
                                  subcategory={subcat !== '—' ? subcat : ''}
                                  emptyLabel="—"
                                />
                              </TableCell>
                              <TableCell className="px-2 py-3">
                                <ShelfStockCell
                                  product={prod}
                                  onViewVariants={setVariantsTarget}
                                />
                              </TableCell>
                              <TableCell className="px-2 py-3">
                                {status ? (
                                  <Badge variant={status.variant} className={status.className}>
                                    {status.label}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </TableCell>

                              <TableCell className="px-2 py-3 font-mono text-xs">
                                {pricing ? formatMoney(pricing.purchase) : '—'}
                              </TableCell>
                              <TableCell className="px-2 py-3 font-mono text-xs">
                                {pricing ? formatMoney(pricing.selling) : '—'}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-xs">
                                {pricing ? `${pricing.taxPct}%` : '—'}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-xs">
                                {pricing ? `${pricing.discountPct}%` : '—'}
                              </TableCell>
                              <TableCell className="px-2 py-3 font-mono text-xs font-bold">
                                {pricing ? formatMoney(pricing.final) : '—'}
                              </TableCell>
                              <TableCell className="px-2 py-3 text-xs">
                                {pricing ? `${pricing.profitPct}%` : '—'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <TablePagination
                page={page}
                pageCount={pageCount}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </SurfaceCard>
          </MotionReveal>

          <BranchVariantStockDialog
            open={Boolean(variantsTarget)}
            product={variantsTarget}
            onOpenChange={(open) => {
              if (!open) setVariantsTarget(null)
            }}
            onViewDemandRequests={openDemandRequests}
          />
        </>
      ) : null}
    </div>
  )
}

export default BranchInventoryPage