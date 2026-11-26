import { useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, Clock, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { HARDWARE_TYPE_OPTIONS } from '@/lib/validation/branchForms'
import { formatSlotKey, formatSlotLabel } from '@/lib/validation/hardwareSlots'
import { formatClockTime } from '@/lib/formatDateTime'
import { HARDWARE_MODES, hardwareModeForRole } from '@/lib/validation/hardwarePolicy'

function availabilityLabel(device) {
  switch (device.availability) {
    case 'available':
      return 'Available'
    case 'partial':
      return 'Partial'
    case 'fully_occupied':
      return 'Fully allocated'
    case 'locked_exclusive':
      return 'Locked'
    case 'inactive':
      return 'Inactive'
    default:
      return device.available ? 'Available' : 'Not available'
  }
}

function badgeClass(device) {
  if (device.availability === 'available') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-100'
  }
  if (device.availability === 'partial') {
    return 'bg-amber-50 text-amber-800 ring-amber-100'
  }
  if (device.availability === 'fully_occupied' || device.availability === 'locked_exclusive') {
    return 'bg-rose-50 text-rose-700 ring-rose-100'
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

// ---------- day / time helpers ----------
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dayIndex = (d) => DAYS.indexOf(String(d).trim().slice(0, 3).toLowerCase())

const uniq = (text, sep) => [
  ...new Set(
    String(text || '')
      .split(sep)
      .map((x) => x.trim())
      .filter(Boolean),
  ),
]

// [mon,tue,wed,thu,fri] -> "Mon – Fri"; [mon,wed] -> "Mon, Wed"
function formatDays(days = []) {
  const idx = [...new Set(days.map(dayIndex).filter((i) => i >= 0))].sort((a, b) => a - b)
  if (!idx.length) return ''
  if (idx.length === 7) return 'Every day'
  const parts = []
  let start = idx[0]
  let prev = idx[0]
  for (let i = 1; i <= idx.length; i += 1) {
    const next = idx[i]
    if (next === prev + 1) {
      prev = next
      continue
    }
    if (start === prev) parts.push(DAY_LABELS[start])
    else if (prev === start + 1) parts.push(`${DAY_LABELS[start]}, ${DAY_LABELS[prev]}`)
    else parts.push(`${DAY_LABELS[start]} – ${DAY_LABELS[prev]}`)
    start = next
    prev = next
  }
  return parts.join(', ')
}

function toMin(value) {
  const m = String(value || '').trim().match(/^(\d{1,2}):(\d{2})/)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function toHHMM(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

// Remove busy ranges from the shift window -> free ranges (minutes)
function subtractBusy(shiftStart, shiftEnd, busy) {
  const sorted = busy
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)
  const free = []
  let cursor = shiftStart
  for (const b of sorted) {
    if (b.start > cursor) free.push({ start: cursor, end: Math.min(b.start, shiftEnd) })
    cursor = Math.max(cursor, b.end)
  }
  if (cursor < shiftEnd) free.push({ start: cursor, end: shiftEnd })
  return free.filter((f) => f.end > f.start)
}

// One row per employee + time slot, with that employee's days merged.
// Source: device.occupiedIntervals = [{ staffName, start, end, day }] from the backend.
function groupAllocations(device) {
  const list = Array.isArray(device.occupiedIntervals) ? device.occupiedIntervals : []
  if (list.length) {
    const map = new Map()
    list.forEach((o) => {
      const key = `${o.staffName}|${o.start}|${o.end}`
      const row = map.get(key) || {
        staffName: o.staffName,
        start: o.start,
        end: o.end,
        days: [],
      }
      if (o.day) row.days.push(o.day)
      map.set(key, row)
    })
    return [...map.values()].map((r) => ({
      staffName: r.staffName || '—',
      days: r.days.length ? formatDays(r.days) : 'All days', // exclusive lock has no day
      time: formatSlotLabel(r.start, r.end),
    }))
  }

  // Fallback if occupiedIntervals is missing: de-duplicate the joined strings
  const names = uniq(device.assignedToName, ',')
  const slots = uniq(device.occupiedSlot, '·')
  if (!names.length && !slots.length) return []
  if (names.length === 1) {
    return (slots.length ? slots : ['']).map((t) => ({
      staffName: names[0],
      days: '',
      time: t,
    }))
  }
  return [{ staffName: names.join(', '), days: '', time: slots.join(' · ') }]
}

// Free time per working day, grouped by identical free slots.
// Result: [{ days: 'Mon – Wed', slots: [{ start, end }] }]
function groupFreeSlots(device, workingDays, scheduleStart, scheduleEnd) {
  const shiftStart = toMin(scheduleStart)
  const shiftEnd = toMin(scheduleEnd)
  const days = [
    ...new Set(
      (Array.isArray(workingDays) ? workingDays : [])
        .map(dayIndex)
        .filter((i) => i >= 0),
    ),
  ].sort((a, b) => a - b)

  const occupied = Array.isArray(device.occupiedIntervals) ? device.occupiedIntervals : []

  // Not enough info for a per-day calculation: show the backend free slots as one group
  if (!days.length || shiftStart == null || shiftEnd == null || shiftStart >= shiftEnd) {
    const slots = Array.isArray(device.freeSlots) ? device.freeSlots : []
    return slots.length
      ? [{ days: days.length ? formatDays(days.map((i) => DAYS[i])) : '', slots }]
      : []
  }

  const groups = new Map()
  days.forEach((di) => {
    const busy = occupied
      .filter((o) => !o.day || dayIndex(o.day) === di) // no day = applies to every day
      .map((o) => ({ start: toMin(o.start), end: toMin(o.end) }))
      .filter((b) => b.start != null && b.end != null)
    const free = subtractBusy(shiftStart, shiftEnd, busy)
    if (!free.length) return // fully busy that day
    const slots = free.map((f) => ({ start: toHHMM(f.start), end: toHHMM(f.end) }))
    const key = slots.map((s) => `${s.start}-${s.end}`).join('|')
    const group = groups.get(key) || { slots, days: [] }
    group.days.push(DAYS[di])
    groups.set(key, group)
  })

  return [...groups.values()].map((g) => ({ days: formatDays(g.days), slots: g.slots }))
}

// Branch hardware list with search/type filter + slot selection (Cashier) or exclusive pick (IM).
// workingDays / scheduleStart / scheduleEnd: the employee's schedule, used to work out free time per day.
export function HardwareAvailabilityBoard({
  role,
  devices = [],
  loading = false,
  scheduleReady = false,
  search = '',
  hardwareType = '',
  selectedDeviceId = '',
  selectedSlotKey = '',
  workingDays = null,
  scheduleStart = '',
  scheduleEnd = '',
  onSearchChange,
  onTypeChange,
  onSelectDevice,
  onSelectSlot,
  onClearSelection,
  onUnavailable,
}) {
  const [openId, setOpenId] = useState(null)
  const mode = hardwareModeForRole(role)
  const showSlotPicker = mode === HARDWARE_MODES.SHARED

  const query = search.trim().toLowerCase()
  const filtered = devices.filter((d) => {
    if (hardwareType && d.type !== hardwareType) return false
    const selectable =
      d.available ||
      d.availability === 'partial' ||
      (Array.isArray(d.freeSlots) && d.freeSlots.length > 0)
    if (!query && !selectable) return false
    if (!query) return true
    return (
      String(d.name || '').toLowerCase().includes(query) ||
      String(d.code || '').toLowerCase().includes(query)
    )
  })

  if (!scheduleReady) {
    return (
      <p className="text-xs text-slate-500 sm:col-span-2">
        Set working days and shift start/end to load hardware availability.
      </p>
    )
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="staff-hardware-search">Search hardware</Label>
          <Input
            id="staff-hardware-search"
            placeholder="Name or HW ID"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="staff-hardware-type-filter">Hardware type</Label>
          <NativeSelect
            id="staff-hardware-type-filter"
            value={hardwareType || ''}
            onChange={(e) => onTypeChange?.(e.target.value)}
          >
            <option value="">All types</option>
            {HARDWARE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Checking device availability…</p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className="text-xs text-amber-700">No hardware matches this filter.</p>
      ) : null}

      <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {filtered.map((device) => {
          const selectable =
            device.available ||
            device.availability === 'partial' ||
            (Array.isArray(device.freeSlots) && device.freeSlots.length > 0)
          const isSelected = selectedDeviceId === device.id
          const open = openId === device.id
          const allocations = groupAllocations(device)
          const hasFree = Array.isArray(device.freeSlots) && device.freeSlots.length > 0
          const hasDetails = allocations.length > 0 || hasFree
          // Only compute free-per-day when the card is open
          const freeGroups = open && hasFree
            ? groupFreeSlots(device, workingDays, scheduleStart, scheduleEnd)
            : []

          return (
            <li
              key={device.id}
              className={`rounded-lg border p-2.5 ${
                isSelected ? 'border-brand-400 bg-brand-50/40' : 'border-slate-100 bg-white'
              }`}
            >
              {/* Compact header row */}
              <div className="flex items-center gap-3">
                {device.imageUrl ? (
                  <img
                    src={device.imageUrl}
                    alt=""
                    className="h-9 w-9 rounded-md object-cover ring-1 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-600">
                    {(device.name || 'H').slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {device.name}
                      {device.code ? (
                        <span className="font-normal text-slate-500"> · {device.code}</span>
                      ) : null}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${badgeClass(device)}`}
                    >
                      {availabilityLabel(device)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{device.type || 'Device'}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? 'brand' : 'outline'}
                  aria-pressed={isSelected}
                  title={isSelected ? 'Click again to deselect' : undefined}
                  aria-disabled={!selectable}
                  className={!selectable ? 'opacity-60' : undefined}
                  onClick={() => {
                    if (!selectable) {
                      onUnavailable?.(device)
                      return
                    }
                    // Click the selected device again -> deselect it
                    if (isSelected) {
                      onClearSelection?.()
                      setOpenId(null)
                      return
                    }
                    setOpenId(device.id)
                    onSelectDevice?.(device)
                  }}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </Button>
                {hasDetails ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? 'Hide allocation details' : 'Show allocation details'}
                    onClick={() => setOpenId(open ? null : device.id)}
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronDown
                      className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                ) : null}
              </div>

              {/* Expanded: allocation summary + free slots by day */}
              {open ? (
                <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                  {allocations.length ? (
                    <>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <CalendarDays className="size-3.5" /> Allocation Summary
                      </p>
                      {allocations.map((a, i) => (
                        <div
                          key={`${a.staffName}-${a.time}-${i}`}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700"
                        >
                          {a.days ? (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                              {a.days}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1 font-medium">
                            <User className="size-3.5 text-slate-400" /> {a.staffName}
                          </span>
                          {a.time ? (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3.5 text-slate-400" /> {a.time}
                            </span>
                          ) : null}
                          <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-100">
                            Occupied
                          </span>
                        </div>
                      ))}
                    </>
                  ) : null}

                  {freeGroups.length ? (
                    <>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <CheckCircle2 className="size-3.5 text-emerald-600" /> Free Slots
                      </p>
                      {freeGroups.map((g, i) => (
                        <div
                          key={`${g.days}-${i}`}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800"
                        >
                          {g.days ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium">
                              {g.days}
                            </span>
                          ) : null}
                          <span className="flex flex-wrap gap-1.5">
                            {g.slots.map((s) => (
                              <span
                                key={formatSlotKey(s.start, s.end)}
                                className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium"
                              >
                                <Clock className="size-3" />
                                {formatSlotLabel(s.start, s.end)}
                              </span>
                            ))}
                          </span>
                          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                            Free
                          </span>
                        </div>
                      ))}
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Cashier slot picker (unchanged behaviour) */}
              {showSlotPicker && isSelected && selectable ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">Available slots</p>
                  <div className="flex flex-wrap gap-2">
                    {(device.freeSlots || []).map((slot) => {
                      const key = formatSlotKey(slot.start, slot.end)
                      const active = selectedSlotKey === key
                      return (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={active ? 'brand' : 'outline'}
                          onClick={() => onSelectSlot?.(device, slot)}
                        >
                          {formatClockTime(slot.start)} – {formatClockTime(slot.end)}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {selectedDeviceId ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onClearSelection?.()}>
          Clear hardware selection
        </Button>
      ) : null}
    </div>
  )
}