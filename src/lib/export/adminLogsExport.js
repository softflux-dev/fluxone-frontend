import { exportRowsToStyledExcel, buildExportFileName } from '@/lib/export/csvExport'
import {
  ADMIN_LOG_CATEGORY_LABELS,
  ADMIN_LOG_ROLE_OPTIONS,
  adminLogCategoryLabel,
  adminLogTabFileSlug,
  formatAdminLogTimestamp,
  localDateInputValue,
} from '@/lib/admin/adminLogs'
import { roleDisplayName } from '@/lib/nav'
const EXPORT_HEADERS = [
  'Timestamp',
  'Branch',
  'Actor',
  'Role',
  'Category',
  'Action',
  'Affected Item',
]

function roleLabel(role) {
  if (!role || role === 'unknown') return '—'
  if (role === 'branch_admin') return 'Local Admin'
  const fromList = ADMIN_LOG_ROLE_OPTIONS.find((r) => r.value === role)
  if (fromList) return fromList.label
  return roleDisplayName(role) || role
}

function exportDateStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
}

function buildFilterSummary(filters = {}, branchesById = {}) {
  const parts = []
  const today = localDateInputValue()
  if (filters.from !== today || filters.to !== today) {
    parts.push(`Date ${filters.from || '—'} to ${filters.to || '—'}`)
  } else {
    parts.push('Date Today')
  }
  if (filters.branchId) {
    parts.push(`Branch ${branchesById[filters.branchId] || filters.branchId}`)
  }
  if (filters.actorRole) {
    const role = ADMIN_LOG_ROLE_OPTIONS.find((r) => r.value === filters.actorRole)
    parts.push(`Role ${role?.label || filters.actorRole}`)
  }
  if (filters.actorUserId) parts.push(`Employee filter applied`)
  if (filters.tab === 'all' && filters.categories?.length) {
    parts.push(
      `Categories ${filters.categories.map((c) => ADMIN_LOG_CATEGORY_LABELS[c] || c).join(', ')}`,
    )
  } else if (filters.tab && filters.tab !== 'all') {
    parts.push(`Tab ${ADMIN_LOG_CATEGORY_LABELS[filters.tab] || filters.tab}`)
  }
  if (filters.action) parts.push(`Action type ${filters.action}`)
  if (filters.actions?.length) parts.push(`Actions ${filters.actions.join(', ')}`)
  if (filters.q?.trim()) parts.push(`Search "${filters.q.trim()}"`)
  return parts.length ? parts.join(' · ') : 'All filters default (Today, all branches)'
}

function mapLogExportRow(row) {
  return [
    formatAdminLogTimestamp(row.createdAt),
    row.branchName || '—',
    row.actorName || '—',
    roleLabel(row.actorRole),
    adminLogCategoryLabel(row.category),
    row.message || '—',
    row.affectedItem || '—',
  ]
}

/**
 * Export selected Admin Log rows — Logs_[TabName]_[DateFrom]_[DateTo].xlsx (styled .xls).
 */
export async function exportAdminLogsSelection({
  rows = [],
  filters = {},
  branchesById = {},
}) {
  if (!rows.length) throw new Error('No rows to export')

  const tabSlug = adminLogTabFileSlug(filters.tab)
  const filename = `admin-logs-${exportDateStamp()}.xlsx`

  await exportRowsToStyledExcel({
    filename,
    sheetName: tabSlug.slice(0, 31) || 'Logs',
    headers: EXPORT_HEADERS,
    rows: rows.map(mapLogExportRow),
    freezeHeader: true,
    enableFilter: true,
  })

  return { filename, exported: rows.length }
}