import { MOVEMENT_TYPES } from '@/lib/control/mapStockMovement'

// UI-only tab ids (thresholds is not a ledger movement type).
export const CONTROL_UI_TAB = {
  IN: MOVEMENT_TYPES.IN,
  OUT: MOVEMENT_TYPES.OUT,
  ADJUSTMENT: MOVEMENT_TYPES.ADJUSTMENT,
  THRESHOLDS: 'thresholds',
}

// Adjustment dialog origin tag (mirrors server CONTROL_SOURCES.ADJUSTMENT)
export const CONTROL_SOURCES = {
  ADJUSTMENT: 'adjustment',
}

// Adjustment tab lists manual adjustments plus stock-out reason buckets.
// Tagged Adjustment stock-in (`in` + control_source) is merged server-side.
export const ADJUSTMENT_LEDGER_TYPES = [
  MOVEMENT_TYPES.ADJUSTMENT,
  MOVEMENT_TYPES.DAMAGED,
  MOVEMENT_TYPES.EXPIRED,
  MOVEMENT_TYPES.OTHER,
]

// Stock Out tab = POS `out` + Adjustment stock-out reasons (dual display)
export const STOCK_OUT_LEDGER_TYPES = [
  MOVEMENT_TYPES.OUT,
  MOVEMENT_TYPES.DAMAGED,
  MOVEMENT_TYPES.EXPIRED,
  MOVEMENT_TYPES.OTHER,
]

export const LEDGER_KIND_OPTIONS = [
  { id: '', label: 'All types' },
  { id: MOVEMENT_TYPES.DAMAGED, label: 'Damaged' },
  { id: MOVEMENT_TYPES.EXPIRED, label: 'Expired' },
  { id: 'stock_in', label: 'Stock in' },

  { id: MOVEMENT_TYPES.OTHER, label: 'Other' },
]

// Stock Out kind filter
export const STOCK_OUT_KIND_OPTIONS = [
  { id: '', label: 'All types' },
  { id: 'sale', label: 'Sale' },

  { id: MOVEMENT_TYPES.DAMAGED, label: 'Damaged' },
  { id: MOVEMENT_TYPES.EXPIRED, label: 'Expired' },
  { id: MOVEMENT_TYPES.OTHER, label: 'Other' },
]
