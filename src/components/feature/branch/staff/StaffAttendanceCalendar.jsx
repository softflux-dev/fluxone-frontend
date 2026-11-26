import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  PartyPopper,
  Plane,
  UserRound,
  X,
} from 'lucide-react'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BRAND } from '@/lib/constants'
import { cn } from '@/lib/utils'
import {
  FULL_WEEK_DAYS,
  WEEK_DAY_OPTIONS,
  normalizeWorkingDays,
} from '@/lib/validation/branchForms'

// ─── Status look & feel ────────────────────────────────────────────────────
// Present is the brand's strong fill (it is the common case, so it should read
// as "all good"); exceptions use tinted fills + a ring so they stand out, and
// every status also carries an icon + label so colour is never the only cue.
const PRESENT_FILL = `linear-gradient(135deg, ${BRAND.deep}, ${BRAND.purple})`

const STATUS = {
  present: {
    label: 'Present',
    Icon: Check,
    dot: PRESENT_FILL,
    cell: 'text-white shadow-[0_4px_12px_rgba(65,34,131,0.28)]',
    style: { background: PRESENT_FILL },
  },
  late: {
    label: 'Late',
    Icon: Clock,
    dot: '#f59e0b',
    cell: 'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-400',
  },
  absent: {
    label: 'Absent',
    Icon: X,
    dot: '#e11d48',
    cell: 'bg-rose-100 text-rose-950 ring-1 ring-inset ring-rose-400',
  },
  leave: {
    label: 'On Leave',
    Icon: Plane,
    dot: '#10b981',
    cell: 'bg-emerald-100 text-emerald-950 ring-1 ring-inset ring-emerald-400',
  },
  holiday: {
    label: 'Holiday',
    Icon: PartyPopper,
    dot: BRAND.purple,
    cell: 'text-purple-950 ring-1 ring-inset ring-purple-300',
    style: { background: BRAND.soft },
  },
}

const SUMMARY_TILES = [
  { key: 'present', label: 'Present', tile: 'bg-purple-50 text-purple-950', num: 'text-purple-900' },
  { key: 'late', label: 'Late', tile: 'bg-amber-50 text-amber-950', num: 'text-amber-700' },
  { key: 'absent', label: 'Absent', tile: 'bg-rose-50 text-rose-950', num: 'text-rose-700' },
  { key: 'leave', label: 'Leave', tile: 'bg-emerald-50 text-emerald-950', num: 'text-emerald-700' },
  { key: 'offDay', label: 'Off-Day Worked', tile: 'bg-orange-50 text-orange-950', num: 'text-orange-600' },
]

const WEEKDAY_HEADERS = WEEK_DAY_OPTIONS.map((d) => d.label) // Mon … Sun
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Date helpers (local time — never toISOString, which shifts the day) ───
const pad = (n) => String(n).padStart(2, '0')
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const logDay = (log) => String(log?.workDate || '').split('T')[0]
// JS getDay(): 0 = Sunday → our Mon-first index 0..6
const mondayIndex = (date) => (date.getDay() + 6) % 7

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Per-employee attendance calendar for the Branch Manager.
 * Mon-first month grid, month summary tiles, legend and a day detail panel.
 */
export function StaffAttendanceCalendar({
  logs = [],
  staff = [],
  designations = [],
  designationId = '',
  onDesignationChange,
  loading = false,
}) {
  const now = new Date()
  const todayIso = isoOf(now.getFullYear(), now.getMonth(), now.getDate())

  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [staffId, setStaffId] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const visibleStaff = useMemo(
    () => staff.filter((m) => !designationId || m.designationId === designationId),
    [staff, designationId],
  )

  // Derived, not synced: fall back to the first visible employee when the
  // picked one is filtered out or the roster changes.
  const member = visibleStaff.find((m) => m.id === staffId) || visibleStaff[0] || null
  const memberId = member?.id || ''
  const memberWorkingDays = member?.workingDays

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = mondayIndex(new Date(year, month, 1))
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7

  // Employee's working week; empty schedule = every day is a working day
  const workingDays = useMemo(() => {
    const days = normalizeWorkingDays(memberWorkingDays)
    return new Set(days.length ? days : FULL_WEEK_DAYS)
  }, [memberWorkingDays])

  const logByDay = useMemo(() => {
    const map = new Map()
    if (!memberId) return map
    for (const log of logs) if (log.staffId === memberId) map.set(logDay(log), log)
    return map
  }, [logs, memberId])

  // Month summary — "off-day worked" = present/late on a non-working day
  const summary = (() => {
    const s = { present: 0, late: 0, absent: 0, leave: 0, holiday: 0, offDay: 0 }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = isoOf(year, month, d)
      const log = logByDay.get(iso)
      if (!log || !(log.status in s)) continue
      s[log.status] += 1
      const dayKey = FULL_WEEK_DAYS[mondayIndex(new Date(year, month, d))]
      if (!workingDays.has(dayKey) && (log.status === 'present' || log.status === 'late')) {
        s.offDay += 1
      }
    }
    return s
  })()

  const goMonth = (delta) => {
    setSelectedDay(null)
    setCursor(new Date(year, month + delta, 1))
  }
  const goToday = () => {
    setSelectedDay(todayIso)
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const selectedLog = selectedDay ? logByDay.get(selectedDay) : null
  const selectedInfo = selectedDay
    ? (() => {
        const [y, m, d] = selectedDay.split('-').map(Number)
        const key = FULL_WEEK_DAYS[mondayIndex(new Date(y, m - 1, d))]
        return { working: workingDays.has(key) }
      })()
    : null

  const designationName = member?.designation || '—'
  const shiftDays = WEEK_DAY_OPTIONS.filter((d) => workingDays.has(d.value))

  return (
    <SurfaceCard
      title="Attendance Calendar"
      description="Month view for one employee — pick someone to see their days at a glance"
    >
      {/* Who are we looking at? */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-1.5">
          <Label htmlFor="cal-designation">Filter Designation</Label>
          <NativeSelect
            id="cal-designation"
            value={designationId}
            onChange={(e) => onDesignationChange?.(e.target.value)}
            className="h-9"
          >
            <option value="">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-employee">Employee</Label>
          <NativeSelect
            id="cal-employee"
            value={memberId}
            onChange={(e) => {
              setSelectedDay(null)
              setStaffId(e.target.value)
            }}
            disabled={!visibleStaff.length}
            className="h-9"
          >
            {!visibleStaff.length ? <option value="">No employees</option> : null}
            {visibleStaff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </NativeSelect>
        </div>

        {member ? (
          <div className="flex items-center gap-3 rounded-xl bg-purple-50/70 px-3.5 py-2.5 ring-1 ring-inset ring-purple-100 sm:col-span-2 lg:col-span-1">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: PRESENT_FILL }}
              aria-hidden="true"
            >
              {initialsOf(member.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{member.fullName}</p>
              <p className="truncate text-xs text-slate-500">
                {designationName}
                {shiftDays.length ? ` · ${shiftDays.map((d) => d.label).join(', ')}` : ''}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : !member ? (
        <EmptyState
          icon={UserRound}
          title="No employee to show"
          description={
            staff.length === 0
              ? 'Add staff to this branch to see their attendance here.'
              : 'No employees match this designation. Choose another one.'
          }
          compact
        />
      ) : (
        <>
          {/* Month summary */}
          <dl className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:grid-cols-5">
            {SUMMARY_TILES.map((t) => (
              <div
                key={t.key}
                className={cn('rounded-xl px-2 py-3 text-center sm:px-3 sm:py-3.5', t.tile)}
              >
                <dd className={cn('text-2xl font-bold leading-none tabular-nums', t.num)}>
                  {summary[t.key]}
                </dd>
                <dt className="mt-1.5 text-[11px] font-medium opacity-80">{t.label}</dt>
              </div>
            ))}
          </dl>

          {/* Month navigation */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => goMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h3
              className="min-w-40 text-center text-base font-bold text-slate-900"
              aria-live="polite"
            >
              {MONTHS[month]} {year}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              onClick={() => goMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-1 h-8 gap-1.5 text-xs text-purple-800"
              onClick={goToday}
            >
              <CalendarDays className="size-3.5" />
              Today
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="mt-4">
            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:gap-2">
              {WEEKDAY_HEADERS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div
              role="group"
              aria-label={`${member.fullName} attendance, ${MONTHS[month]} ${year}`}
              className="grid grid-cols-7 gap-1.5 sm:gap-2"
            >
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div
                  key={`lead-${i}`}
                  aria-hidden="true"
                  className="h-12 rounded-xl bg-slate-100/70 sm:h-[3.75rem]"
                />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const iso = isoOf(year, month, day)
                const dayKey = FULL_WEEK_DAYS[mondayIndex(new Date(year, month, day))]
                const working = workingDays.has(dayKey)
                const log = logByDay.get(iso)
                const info = log ? STATUS[log.status] : null
                const offDayWorked =
                  Boolean(info) && !working && (log.status === 'present' || log.status === 'late')
                const isToday = iso === todayIso
                const isSelected = iso === selectedDay
                const Icon = info?.Icon

                const label = [
                  longDate(iso),
                  info ? info.label : working ? 'No record' : 'Non-working day',
                  offDayWorked ? 'worked on a non-working day' : null,
                ]
                  .filter(Boolean)
                  .join(', ')

                return (
                  <button
                    key={iso}
                    type="button"
                    aria-label={label}
                    aria-pressed={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    onClick={() => setSelectedDay(isSelected ? null : iso)}
                    style={info?.style}
                    className={cn(
                      'relative flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent text-sm font-semibold sm:h-[3.75rem]',
                      'motion-safe:transition-[box-shadow,transform,background-color] motion-safe:duration-150',
                      'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700',
                      info
                        ? info.cell
                        : working
                          ? 'border-slate-200 bg-white text-slate-800 hover:bg-purple-50/60'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200/70',
                      offDayWorked && 'outline-2 -outline-offset-2 outline-orange-500',
                      isSelected && 'outline-2 outline-offset-2 outline-purple-700',
                      !isSelected && 'active:scale-[0.97]',
                    )}
                  >
                    <span className="leading-none tabular-nums">{day}</span>
                    {Icon ? (
                      <Icon
                        className="size-3 opacity-90 sm:size-3.5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                      />
                    ) : null}
                    {isToday ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute right-1.5 top-1.5 size-1.5 rounded-full',
                          info?.style || log?.status === 'present' ? 'bg-white' : 'bg-purple-700',
                        )}
                      />
                    ) : null}
                  </button>
                )
              })}

              {Array.from({ length: trailingBlanks }).map((_, i) => (
                <div
                  key={`trail-${i}`}
                  aria-hidden="true"
                  className="flex h-12 items-center justify-center rounded-xl bg-slate-100/70 text-sm font-medium text-slate-300 sm:h-[3.75rem]"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
            {Object.entries(STATUS).map(([key, s]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: s.dot }}
                  aria-hidden="true"
                />
                {s.label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-[3px] bg-white"
                style={{ boxShadow: 'inset 0 0 0 2px #f97316' }}
                aria-hidden="true"
              />
              Worked on a non-working day
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-slate-200" aria-hidden="true" />
              Non-working day
            </li>
          </ul>

          {/* Selected day detail */}
          <div className="mt-4 min-h-[3.5rem]" aria-live="polite">
            {selectedDay ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-slate-50/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{longDate(selectedDay)}</p>
                  <p className="text-xs text-slate-500">
                    {selectedInfo?.working ? 'Working day' : 'Non-working day'}
                    {!selectedInfo?.working &&
                    (selectedLog?.status === 'present' || selectedLog?.status === 'late')
                      ? ' · worked'
                      : ''}
                  </p>
                </div>
                {selectedLog && STATUS[selectedLog.status] ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                      selectedLog.status === 'present'
                        ? 'bg-purple-100 text-purple-900'
                        : STATUS[selectedLog.status].cell,
                    )}
                    style={selectedLog.status === 'holiday' ? STATUS.holiday.style : undefined}
                  >
                    {(() => {
                      const I = STATUS[selectedLog.status].Icon
                      return <I className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                    })()}
                    {STATUS[selectedLog.status].label}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">No attendance recorded</span>
                )}
                {selectedLog?.note ? (
                  <p className="min-w-0 flex-1 text-xs italic text-slate-500">
                    “{selectedLog.note}”
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="px-1 py-2 text-xs text-slate-400">
                Select a day to see its status and note.
              </p>
            )}
          </div>
        </>
      )}
    </SurfaceCard>
  )
}

export default StaffAttendanceCalendar
