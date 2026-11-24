import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { toastError, toastSuccess } from '@/lib/toast'
import { BranchCapsule } from '@/components/shared/BranchRoleCapsules'
import { displayNotification } from '@/lib/notificationDisplay'
import { DateTimeLines } from '@/components/shared/DateTimeLines'
import { cn } from '@/lib/utils'
import { TableRowsSkeleton } from '@/components/ui/skeleton'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNotificationsInbox } from '@/hooks/shared/useNotifications'

const PAGE_SIZE = 10

// Outline buttons: keep border + text readable on dark surfaces
const OUTLINE_DARK =
  'dark:border-slate-600 dark:bg-transparent dark:text-slate-100 dark:hover:bg-slate-800 dark:disabled:text-slate-500'

// Full notification inbox — mark as read only (no wipe / delete from inbox)
export function NotificationsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all') // all | unread
  const onLoadError = useCallback(
    (message) => toastError(message || 'Failed to load notifications'),
    [],
  )
  const { items, unreadCount, loading, mutating, markRead, markAll } = useNotificationsInbox({
    filter,
    onLoadError,
  })

  // Pagination state and logic
  const [page, setPage] = useState(1)
  const listTopRef = useRef(null)

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  // back to page 1 when switching All / Unread
  useEffect(() => {
    setPage(1)
  }, [filter])

  // if items shrink (e.g. after mark read in Unread filter), don't stay on a missing page
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  )

  const goToPage = (p) => {
    setPage(p)
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // compact numbers like: 1 … 4 5 6 … 20
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const set = new Set([1, totalPages, page - 1, page, page + 1])
    const sorted = [...set].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
    const out = []
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
      out.push(p)
    })
    return out
  })()

  const handleMarkRead = async (id) => {
    const res = await markRead(id)
    if (!res.success) {
      toastError(res.error || 'Failed to mark as read')
    }
  }

  // Production pattern — mark all read, never delete the inbox
  const handleMarkAll = async () => {
    const res = await markAll()
    if (!res.success) {
      toastError(res.error || 'Failed to mark all as read')
      return
    }
    toastSuccess('All notifications marked as read')
  }

  const openItem = async (n) => {
    if (!n.isRead) await handleMarkRead(n.id)
    if (n.linkPath) navigate(n.linkPath)
  }

  return (
    <div className="space-y-6 pb-8">
      <MotionHeader>
        <PageHeader
          eyebrow="Inbox"
          title="Notifications"
          description="All alerts for your account — mark as read to clear the unread badge"
          actions={
            unreadCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                className={OUTLINE_DARK}
                disabled={mutating}
                onClick={handleMarkAll}
              >
                Mark all as read
              </Button>
            ) : null
          }
        />
      </MotionHeader>

      <MotionReveal>
        <SurfaceCard title="Your notifications" description={`${unreadCount} unread`}>
          <div ref={listTopRef} className="mb-4 flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'brand' : 'outline'}
              className={filter === 'all' ? undefined : OUTLINE_DARK}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'brand' : 'outline'}
              className={filter === 'unread' ? undefined : OUTLINE_DARK}
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>

          {loading ? (
            <TableRowsSkeleton rows={4} className="px-1" />
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-300">
              No notifications
            </p>
          ) : (
            <>
              {/* Each notification is its own card: spacing + border + state background */}
              <ul className="space-y-3">
                {pageItems.map((n) => {
                  const { title, body, branchName } = displayNotification(n)

                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
                        n.isRead
                          ? 'border-border bg-white dark:border-slate-700 dark:bg-slate-900/70'
                          : 'border-purple-200 bg-purple-50/60 dark:border-purple-400/30 dark:bg-purple-500/15',
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 cursor-pointer text-left"
                        onClick={() => openItem(n)}
                      >
                        <div className="flex items-center gap-2">
                          {!n.isRead ? (
                            <span className="size-2 shrink-0 rounded-full bg-[#8E238F] dark:bg-purple-400" />
                          ) : (
                            <span className="size-2 shrink-0" />
                          )}

                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {title}
                          </p>
                        </div>

                        {branchName ? (
                          <div className="mt-1 min-w-0 max-w-full pl-4">
                            <BranchCapsule branchName={branchName} />
                          </div>
                        ) : null}

                        {body ? (
                          <p className="mt-1 pl-4 whitespace-normal break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {body}
                          </p>
                        ) : null}

                        <div className="mt-2 pl-4 text-[11px] text-slate-500 dark:text-slate-400">
                          <DateTimeLines
                            value={n.createdAt}
                            timeClassName="text-[11px] text-slate-500 dark:text-slate-400"
                          />

                          {n.linkPath ? (
                            <span className="mt-1 block text-xs font-medium text-[#8E238F] underline-offset-2 hover:underline dark:text-purple-300">
                              Click to open
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <div className="flex shrink-0 gap-1">
                        {!n.isRead ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-[#8E238F] hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-500/20 dark:hover:text-purple-200"
                            onClick={() => handleMarkRead(n.id)}
                          >
                            Mark read
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Pagination bar */}
              {items.length > PAGE_SIZE && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, items.length)} of {items.length}
                  </p>

                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className={OUTLINE_DARK}
                      disabled={page === 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      Previous
                    </Button>

                    {pageNumbers.map((p, i) =>
                      p === '…' ? (
                        <span
                          key={`gap-${i}`}
                          className="px-2 text-sm text-slate-400 dark:text-slate-300"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          size="sm"
                          variant={p === page ? 'brand' : 'outline'}
                          className={p === page ? undefined : OUTLINE_DARK}
                          onClick={() => goToPage(p)}
                        >
                          {p}
                        </Button>
                      ),
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className={OUTLINE_DARK}
                      disabled={page === totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SurfaceCard>
      </MotionReveal>
    </div>
  )
}

export default NotificationsPage