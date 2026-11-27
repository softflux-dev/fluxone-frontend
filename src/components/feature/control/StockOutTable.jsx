import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { controlColumnsForTab } from '@/components/feature/control/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/control/mapStockMovement'

// Stock out is read-only — no row actions.
export function StockOutTable({
  items,
  loading,
  pagination,
  ledgerKind = '',
  ledgerKindOptions = [],
  onLedgerKindChange,
  onPageChange,
  onPageSizeChange,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Stock out history"
      description="POS sales and Adjustment stock-out (damaged, expired, other)"
      actions={
        <select
          value={ledgerKind}
          onChange={(e) => onLedgerKindChange?.(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {(ledgerKindOptions || []).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      }
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.OUT)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyTitle="No stock-out records"
      emptyHint="Sales and Adjustment stock-out records appear here."
      className={className}
    />
  )
}
