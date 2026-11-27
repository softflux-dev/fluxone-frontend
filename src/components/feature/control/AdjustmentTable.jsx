import { Plus } from 'lucide-react'
import { MovementHistoryTable } from '@/components/feature/control/MovementHistoryTable'
import { MovementRowMenu } from '@/components/feature/control/MovementRowMenu'
import { Button } from '@/components/ui/button'
import { controlColumnsForTab } from '@/components/feature/control/controlTableColumns'
import { MOVEMENT_TYPES } from '@/lib/control/mapStockMovement'

export function AdjustmentTable({
  items,
  loading,
  pagination,
  ledgerKind = '',
  ledgerKindOptions = [],
  onLedgerKindChange,
  onPageChange,
  onPageSizeChange,
  onAddAdjustment,
  onViewDetails,
  className,
}) {
  return (
    <MovementHistoryTable
      title="Adjustment history"
      description="Manual corrections, damaged, expired, and other stock movements"
      actions={
        <div className="flex items-center gap-2">
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
          <Button type="button" variant="brand" onClick={onAddAdjustment}>
            <Plus className="size-4" />
            Add adjustment
          </Button>
        </div>
      }
      items={items}
      loading={loading}
      pagination={pagination}
      columns={controlColumnsForTab(MOVEMENT_TYPES.ADJUSTMENT)}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      renderRowActions={(row) => (
        <MovementRowMenu
          row={row}
          tab={MOVEMENT_TYPES.ADJUSTMENT}
          onViewDetails={onViewDetails}
        />
      )}
      emptyTitle="No adjustments"
      emptyHint="Create an adjustment with a required reason."
      className={className}
    />
  )
}
