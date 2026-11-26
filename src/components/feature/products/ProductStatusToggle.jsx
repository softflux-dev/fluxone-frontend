import { useEffect, useState } from 'react'
import { Boxes, Layers, Package } from 'lucide-react'
import { EntityStatusToggle, isEntityActive } from '@/components/shared/EntityStatusToggle'
import { BRAND } from '@/lib/constants'
import { PRODUCT_TYPES } from '@/lib/products/mapProduct'

// Display-only Active / Inactive capsule — soft toggle lives in Actions (Ban / Unlock).
export function ProductStatusToggle({
  status,
  loading = false,
  onChange,
  interactive = false,
  className,
}) {
  return (
    <EntityStatusToggle
      status={status}
      loading={loading}
      interactive={interactive}
      activeLabel="Active"
      inactiveLabel="Inactive"
      activeTitle="Click to deactivate"
      inactiveTitle="Click to activate"
      onChange={(nextActive) => onChange?.(nextActive ? 'active' : 'inactive')}
      className={className}
    />
  )
}

export { isEntityActive }

// One look per product type
const TYPE_STYLE = {
  [PRODUCT_TYPES.SINGLE]: {
    Icon: Package,
    label: 'Single',
    bg: `linear-gradient(145deg, ${BRAND.purple}, ${BRAND.deep})`,
    pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/30',
  },
  [PRODUCT_TYPES.BUNDLE]: {
    Icon: Boxes,
    label: 'Bundle',
    bg: 'linear-gradient(145deg, #f59e0b, #b45309)',
    pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30',
  },
  [PRODUCT_TYPES.VARIANT]: {
    Icon: Layers,
    label: 'Variant',
    bg: 'linear-gradient(145deg, #0ea5e9, #0369a1)',
    pill: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/30',
  },
}

// Small colored type label (Single / Bundle / Variant) shown under the product name.
export function ProductTypePill({ type, className = '' }) {
  const style = TYPE_STYLE[type]
  if (!style) return null
  const { Icon } = style
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${style.pill} ${className}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {style.label}
    </span>
  )
}

// Product image. No photo or a broken photo -> type-colored icon tile. No overlays, nothing clipped.
export function ProductImageCell({ src, name, type }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const style = TYPE_STYLE[type] || TYPE_STYLE[PRODUCT_TYPES.SINGLE]
  const { Icon } = style

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || ''}
        onError={() => setFailed(true)}
        className="size-10 shrink-0 rounded-xl bg-white object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
      />
    )
  }

  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
      style={{ background: style.bg }}
      role="img"
      aria-label={name || 'No product image'}
    >
      <Icon className="size-5" />
    </div>
  )
}