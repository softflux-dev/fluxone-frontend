import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { MotionHeader, MotionReveal } from '@/components/shared/MotionReveal'
import { PerformanceDetailHeader } from '@/components/feature/branch/performance/PerformanceDetailHeader'
import { PerformanceDetailSkeleton } from '@/components/feature/branch/performance/PerformanceDetailSkeleton'
import { PerformanceSummaryCards } from '@/components/feature/branch/performance/PerformanceSummaryCards'
import { PerformanceTrendChart } from '@/components/feature/branch/performance/PerformanceTrendChart'
import { PerformanceCriteriaBreakdown } from '@/components/feature/branch/performance/PerformanceCriteriaBreakdown'
import { PerformanceHistoryTimeline } from '@/components/feature/branch/performance/PerformanceHistoryTimeline'
import { ScoreEmployeeDialog } from '@/components/feature/branch/performance/ScoreEmployeeDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PATHS } from '@/router/paths'
import { useBranchPerformanceDetail } from '@/hooks/branch/useBranchPerformanceDetail'

const SLOW_LOAD_MS = 8000

const dateInputClasses =
  'w-44 sm:w-48 px-3 tabular-nums [&::-webkit-datetime-edit]:px-1 [&::-webkit-datetime-edit-fields-wrapper]:gap-0.5 [&::-webkit-calendar-picker-indicator]:ml-1.5 [&::-webkit-calendar-picker-indicator]:cursor-pointer'

// Default range: last 12 months (matches the previous default preset).
const today = new Date()
const defaultEndInput = today.toISOString().split('T')[0]
const defaultStartInput = new Date(
  today.getFullYear(),
  today.getMonth() - 12,
  today.getDate(),
).toISOString().split('T')[0]

export function PerformanceEmployeePage() {
  const { staffId } = useParams()
  const [searchParams] = useSearchParams()

  const { detail, criteria, loading, loadEmployeeDetail, loadScales } =
    useBranchPerformanceDetail()
  const [error, setError] = useState(null)
  const [slow, setSlow] = useState(false)
  const [applyingFilter, setApplyingFilter] = useState(false)
  const [startDate, setStartDate] = useState(defaultStartInput)
  const [endDate, setEndDate] = useState(defaultEndInput)
  const [dateError, setDateError] = useState(null)
  // Refs keep the latest picker values without making the mount effect
  // re-run on every picker change (explicit Apply only).
  const startDateRef = useRef(startDate)
  const endDateRef = useRef(endDate)
  const [timelinePage, setTimelinePage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [scoreOpen, setScoreOpen] = useState(false)

  // Back to Staff → Performance roster (keep search/filter)
  const backHref = useMemo(() => {
    const params = new URLSearchParams()
    params.set('tab', 'performance')
    const q = searchParams.get('q')
    const designation = searchParams.get('designation')
    if (q) params.set('q', q)
    if (designation) params.set('designation', designation)
    return `${PATHS.branch.staff}?${params.toString()}`
  }, [searchParams])

  const loadDetail = useCallback(async (startDate, endDate) => {
    if (!staffId) return
    setError(null)
    setSlow(false)
    const res = await loadEmployeeDetail(staffId, {
      startDate,
      endDate,
      timelinePage,
      timelineLimit: 10,
    })
    setSlow(false)
    if (!res.success) {
      setError(res.error || 'Failed to load performance detail')
    }
  }, [staffId, timelinePage, loadEmployeeDetail])

  const handleApply = useCallback(async () => {
    if (startDate && endDate && endDate < startDate) {
      setDateError('End date must be on or after start date')
      return
    }
    setDateError(null)
    setTimelinePage(1)
    setApplyingFilter(true)
    try {
      await loadDetail(startDate, endDate)
    } finally {
      setApplyingFilter(false)
    }
  }, [startDate, endDate, loadDetail])

  const handleReset = useCallback(async () => {
    setStartDate(defaultStartInput)
    setEndDate(defaultEndInput)
    setDateError(null)
    setTimelinePage(1)
    setApplyingFilter(true)
    try {
      await loadDetail(defaultStartInput, defaultEndInput)
    } finally {
      setApplyingFilter(false)
    }
  }, [loadDetail])

  useEffect(() => {
    // Intentional: only fetch on mount. Date changes are applied explicitly via Apply.
    void loadDetail(startDateRef.current, endDateRef.current)
  }, [loadDetail])

  // Keep refs in sync with the latest picker values (refs are not tracked by
  // exhaustive-deps, so the mount effect above does not re-run on picker change).
  useEffect(() => {
    startDateRef.current = startDate
    endDateRef.current = endDate
  }, [startDate, endDate])

  useEffect(() => {
    void loadScales()
  }, [loadScales])

  // Soft slow-load hint — does not block; Retry available when still loading
  useEffect(() => {
    if (!loading || detail) {
      setSlow(false)
      return undefined
    }
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [loading, detail])

  // Bind chart point → matching timeline row (by evaluationId, not date)
  const handlePointClick = (evaluationId) => {
    if (!evaluationId) return
    setHighlightId(evaluationId)
    setExpandedId(evaluationId)
    const items = detail?.timeline?.items || []
    if (items.some((i) => i.id === evaluationId)) return
    // Newest page first — jump home so scrollIntoView can find the row
    if (timelinePage !== 1) setTimelinePage(1)
  }

  if (loading && !detail) {
    return (
      <PerformanceDetailSkeleton
        slow={slow}
        onRetry={() => void loadDetail()}
      />
    )
  }

  if (error && !detail) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm font-medium text-red-600">{error}</p>
        <p className="text-xs text-slate-500">
          Something went wrong while loading this employee's performance.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="brand" onClick={() => void loadDetail()}>
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link to={backHref}>Back to roster</Link>
          </Button>
        </div>
      </div>
    )
  }

  const employee = detail?.employee
  const empty = !detail?.summary?.evaluationCount

  return (
    <div className="space-y-6 pb-10">
      <MotionHeader>
        <PerformanceDetailHeader
          employee={employee}
          backHref={backHref}
          canScore={Boolean(employee?.canScore)}
          onScore={() => setScoreOpen(true)}
        />
      </MotionHeader>

      {empty ? (
        <MotionReveal>
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <p className="text-base font-semibold text-foreground">No performance scores yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Record the first evaluation to unlock trend, breakdown, and history.
            </p>
            {employee?.canScore ? (
              <Button className="mt-4" variant="brand" onClick={() => setScoreOpen(true)}>
                Score Employee
              </Button>
            ) : null}
          </div>
        </MotionReveal>
      ) : (
        <>
          <MotionReveal delay={0.04}>
            <PerformanceSummaryCards summary={detail.summary} />
          </MotionReveal>

          <MotionReveal delay={0.06}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <Label
                    htmlFor="trend-start-date"
                    className="whitespace-nowrap text-xs font-medium text-slate-600"
                  >
                    Start date
                  </Label>
                  <Input
                    id="trend-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      if (dateError) setDateError(null)
                    }}
                    className={dateInputClasses}
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <Label
                    htmlFor="trend-end-date"
                    className="whitespace-nowrap text-xs font-medium text-slate-600"
                  >
                    End date
                  </Label>
                  <Input
                    id="trend-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      if (dateError) setDateError(null)
                    }}
                    className={dateInputClasses}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleApply()}
                  disabled={Boolean(dateError) || applyingFilter}
                  className="text-sm"
                >
                  {applyingFilter ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Apply Filter'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleReset()}
                  disabled={applyingFilter}
                  className="text-sm"
                >
                  Reset
                </Button>
              </div>
              {dateError ? (
                <p className="w-full text-xs font-medium text-red-600">{dateError}</p>
              ) : null}
            </div>
            <PerformanceTrendChart
              chart={detail.chart}
              onPointClick={handlePointClick}
            />
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <PerformanceCriteriaBreakdown
              items={detail.criteriaBreakdown}
              previousItems={detail.previousCriteria}
            />
          </MotionReveal>

          <MotionReveal delay={0.1}>
            <PerformanceHistoryTimeline
              timeline={detail.timeline}
              expandedId={expandedId}
              highlightId={highlightId}
              onToggleExpand={(id) =>
                setExpandedId((prev) => (prev === id ? null : id))
              }
              onPageChange={setTimelinePage}
            />
          </MotionReveal>
        </>
      )}

      <ScoreEmployeeDialog
        open={scoreOpen}
        onOpenChange={setScoreOpen}
        employee={
          employee
            ? { staffId: employee.staffId, fullName: employee.fullName }
            : null
        }
        criteria={criteria}
        onSuccess={() => {
          void loadDetail()
        }}
      />
    </div>
  )
}

export default PerformanceEmployeePage