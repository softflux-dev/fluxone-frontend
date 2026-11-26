import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, TagIcon, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/api/api'
import { endpoints } from '@/api/endpoints'
import { useCurrency } from '@/hooks/shared/useCurrency'
import { usePermissions } from '@/hooks/shared/usePermissions'
import { formatDateTime } from '@/lib/formatDateTime'
import { toastError, toastSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'

const STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'superseded', label: 'Overridden' },
]

// IM reviews Local Admin (POS) price changes: product, old -> new price, units sold in the window.
export function PricingApprovalsPage() {
  const { format } = useCurrency()
  const { can } = usePermissions()
  const canResolve = can('items:write')
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => new Set())
  const [confirm, setConfirm] = useState(null) // 'approve' | 'reject'
  const [mutating, setMutating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiClient.get(endpoints.pricingApprovals.list, { status })
    if (res.success && Array.isArray(res.data?.items)) {
      setItems(res.data.items)
    } else {
      setItems([])
      toastError(res.error || 'Failed to load price approvals')
    }
    setSelected(new Set())
    setLoading(false)
  }, [status])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const allSelected = items.length > 0 && selected.size === items.length
  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected])
  const totals = useMemo(
    () => ({
      units: selectedItems.reduce((n, i) => n + Number(i.unitsSold || 0), 0),
      sales: selectedItems.reduce((n, i) => n + Number(i.salesCount || 0), 0),
    }),
    [selectedItems],
  )

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function resolve() {
    const action = confirm
    setMutating(true)
    const res = await apiClient.post(endpoints.pricingApprovals.resolve, {
      action,
      ids: selectedItems.map((i) => i.id),
    })
    setMutating(false)
    if (!res.success) {
      toastError(res.error || 'Could not update prices')
      return
    }
    const count = res.data?.count ?? selectedItems.length
    toastSuccess(
      action === 'approve'
        ? `${count} price(s) approved`
        : `${count} price(s) rejected and reverted`,
    )
    setConfirm(null)
    load()
  }

  const isPending = status === 'pending'

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Pricing"
          title="Pricing Approval"
          description="Prices changed on the cashier POS by the Local Admin. The POS keeps selling at the new price until you approve or reject it. Rejecting restores the previous price immediately. Sales already made are never changed."
        />
      </MotionHeader>

      <MotionReveal delay={0.04}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border bg-white p-1" role="tablist">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={status === s.key}
                onClick={() => setStatus(s.key)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium',
                  status === s.key
                    ? 'bg-purple-50 text-purple-800'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {isPending && canResolve && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">
                {selected.size
                  ? `${selected.size} selected · ${totals.units} unit(s) sold in ${totals.sales} sale(s)`
                  : 'Select items to approve or reject'}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={!selected.size}
                onClick={() => setConfirm('reject')}
              >
                <X className="size-4" /> Reject
              </Button>
              <Button size="sm" disabled={!selected.size} onClick={() => setConfirm('approve')}>
                <Check className="size-4" /> Approve
              </Button>
            </div>
          )}
        </div>
      </MotionReveal>

      <MotionReveal delay={0.06}>
        {loading ? (
          <TableRowsSkeleton rows={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={TagIcon}
            title={isPending ? 'No price changes waiting' : 'Nothing to show'}
            description={
              isPending ? 'POS price changes will appear here for your approval.' : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  {isPending && canResolve && (
                    <th className="w-10 p-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) =>
                          setSelected(v ? new Set(items.map((i) => i.id)) : new Set())
                        }
                        aria-label="Select all"
                      />
                    </th>
                  )}
                  <th className="p-3">Product</th>
                  <th className="p-3">Price change</th>
                  <th className="p-3">Changed by</th>
                  <th className="p-3">When</th>
                  <th className="p-3 text-right">Sold at new price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((row) => (
                  <tr key={row.id}>
                    {isPending && canResolve && (
                      <td className="p-3">
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggle(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                      </td>
                    )}
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">
                        {[row.name, row.variantLabel].filter(Boolean).join(' - ')}
                      </p>
                      {row.itemCode && <p className="text-xs text-slate-500">{row.itemCode}</p>}
                    </td>
                    <td className="p-3">
                      <span className="text-slate-500 line-through">{format(row.oldPrice)}</span>{' '}
                      <span className="font-bold text-slate-900">{format(row.newPrice)}</span>
                      {row.changeCount > 1 && (
                        <p className="text-xs text-slate-500">
                          {row.changeCount} changes combined
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <p>{row.changedBy || 'POS user'}</p>
                      <p className="text-xs text-slate-500">{row.deviceId || 'Unknown device'}</p>
                    </td>
                    <td className="p-3 text-slate-600">{formatDateTime(row.changedAt)}</td>
                    <td className="p-3 text-right">
                      <p className="font-semibold">{Number(row.unitsSold)} unit(s)</p>
                      <p className="text-xs text-slate-500">{row.salesCount} sale(s)</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MotionReveal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        variant={confirm === 'approve' ? 'success' : 'destructive'}
        title={confirm === 'approve' ? 'Approve POS prices?' : 'Reject POS prices?'}
        description={
          confirm === 'approve'
            ? `${selected.size} price change(s) become the official price.`
            : `${selected.size} price(s) go back to the previous price right away. ${totals.units} unit(s) already sold at the POS price stay on record and are tagged as price disputes.`
        }
        confirmLabel={confirm === 'approve' ? 'Approve' : 'Reject'}
        onConfirm={resolve}
        loading={mutating}
      />
    </div>
  )
}

export default PricingApprovalsPage
