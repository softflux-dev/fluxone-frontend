import { useCallback, useEffect, useMemo, useState } from 'react'

// selection logic as its in adminlog
export function useMatchingSelection({ total = 0, items = [], resetKey = '' }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [deselectedIds, setDeselectedIds] = useState(() => new Set())
  const [selectAllMatching, setSelectAllMatching] = useState(false)

  // if tab, filters and search change then selection resets
  useEffect(() => {
    setSelectedIds(new Set())
    setDeselectedIds(new Set())
    setSelectAllMatching(false)
  }, [resetKey])

  const selectedCount = useMemo(
    () => (selectAllMatching ? Math.max(0, total - deselectedIds.size) : selectedIds.size),
    [selectAllMatching, total, deselectedIds.size, selectedIds.size],
  )

  const isRowSelected = useCallback(
    (id) => (selectAllMatching ? !deselectedIds.has(id) : selectedIds.has(id)),
    [selectAllMatching, deselectedIds, selectedIds],
  )

  const toggleRow = useCallback(
    (id) => {
      const flip = (prev) => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
      }
      if (selectAllMatching) setDeselectedIds(flip)
      else setSelectedIds(flip)
    },
    [selectAllMatching],
  )

  const toggleAllMatching = useCallback((selectAll) => {
    setSelectAllMatching(Boolean(selectAll))
    setSelectedIds(new Set())
    setDeselectedIds(new Set())
  }, [])

  const allVisibleSelected = items.length > 0 && items.every((r) => isRowSelected(r.id))
  const someVisibleSelected = items.some((r) => isRowSelected(r.id))

  return {
    selectedIds, deselectedIds, selectAllMatching,
    selectedCount, isRowSelected, toggleRow, toggleAllMatching,
    allVisibleSelected, someVisibleSelected,
  }
}