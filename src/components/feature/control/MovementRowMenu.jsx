import { ActionIconButton } from '@/components/shared/ActionIconButton'
import { CONTROL_UI_TAB } from '@/lib/control/controlTabs'
import { MOVEMENT_TYPES } from '@/lib/control/mapStockMovement'
import { cn } from '@/lib/utils'

// Row actions — direct icons (no ⋮ dropdown), tab-aware for Control history tables.
export function MovementRowMenu({
  row,
  tab,
  onUpdateStock,
  onViewDetails,
  onEditThreshold,
  className,
}) {
  const canUpdateStock = tab === MOVEMENT_TYPES.IN && Boolean(onUpdateStock)
  const canViewDetails =
    (tab === MOVEMENT_TYPES.IN || tab === MOVEMENT_TYPES.ADJUSTMENT) && Boolean(onViewDetails)
  const canEditThreshold = tab === CONTROL_UI_TAB.THRESHOLDS && Boolean(onEditThreshold)

  if (!canUpdateStock && !canViewDetails && !canEditThreshold) {
    return <span className="text-xs text-slate-400">—</span>
  }

  return (
    <div className={cn('inline-flex items-center justify-start gap-2.5', className)}>
      {canUpdateStock ? (
        <ActionIconButton
          action="edit"
          label="Update stock"
          onClick={() => onUpdateStock?.(row)}
        />
      ) : null}
      {canViewDetails ? (
        <ActionIconButton
          action="view"
          label="View details & history"
          onClick={() => onViewDetails?.(row)}
        />
      ) : null}
      {canEditThreshold ? (
        <ActionIconButton
          action="edit"
          label="Edit"
          onClick={() => onEditThreshold?.(row)}
        />
      ) : null}
    </div>
  )
}

export default MovementRowMenu