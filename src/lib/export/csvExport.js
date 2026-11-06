
// Excel/CSV formula injection se bachao: =, +, -, @ se shuru hone wala text
function neutralizeFormula(text) {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

export function escapeCsvCell(value) {
  let text = String(value ?? '')
  // Sirf text par lagao (number -5 jaisi values ko mat chhedo)
  if (typeof value === 'string') text = neutralizeFormula(text)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function rowsToCsv(headers = [], rows = []) {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }
  return lines.join('\n')
}

// UTF-8 BOM so Excel opens international characters correctly
export function downloadCsv(filename, csvContent) {
  const safeName = String(filename || 'export.csv').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportRowsToCsv({ filename, headers, rows }) {
  if (!rows?.length) {
    throw new Error('No rows to export')
  }
  await exportRowsToStyledExcel({ filename, headers, rows })
}

// '#8E238F' -> 'FF8E238F' (ExcelJS ARGB format)
function toArgb(hex, fallback = '#8E238F') {
  const clean = String(hex || fallback).replace('#', '')
  return `FF${clean.toUpperCase()}`
}

const EXCEL_FONT = 'Times New Roman'

// File name: module-DD-MM-YYYY.xlsx (e.g. admin-logs-06-11-2026.xlsx)
export function buildExportFileName(moduleName, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const slug = String(moduleName).trim().toLowerCase().replace(/\s+/g, '-')
  return `${slug}-${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}.xlsx`
}
 
// Kisi bhi module ka purana naam ho (Staff_Export_2026-11-06.xlsx, Logs_Stock_28Oct2026.xlsx),
// usay module-DD-MM-YYYY.xlsx mein badal deta hai
function normalizeExportFileName(rawName) {
  const slug =
    String(rawName || 'export')
      .replace(/\.(xlsx|xls|csv)$/i, '')
      .split(/[_\s-]+/)
      .filter((part) => part && !/\d/.test(part)) // tareekh/numbers wale hisse hata do
      .join('-')
      .toLowerCase() || 'export'
  return buildExportFileName(slug)
}

// Real .xlsx: purple bold header (row 1), frozen, auto-width, Times New Roman
export async function exportRowsToStyledExcel({
  filename,
  headers = [],
  rows = [],
  sheetName = 'Export',
  freezeHeader = true,
  enableFilter = true,
}) {
  if (!rows?.length) {
    throw new Error('No rows to export')
  }

  // Sirf export ke waqt load hota hai
  const { default: ExcelJS } = await import('exceljs')

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(String(sheetName).slice(0, 31) || 'Export')

  ws.addRow(headers)
  for (const row of rows) ws.addRow(row.map((cell) => cell ?? ''))

  // Poori sheet: Times New Roman
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: EXCEL_FONT, size: 11 }
      cell.alignment = { vertical: 'middle', wrapText: false }
    })
  })

  // Row 1: bold, purple background, white text
  const headerFill = toArgb('#8E238F')
  const headerRow = ws.getRow(1)
  headerRow.height = 22
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: EXCEL_FONT, size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } }
  })

  // Row 1 freeze
  if (freezeHeader) ws.views = [{ state: 'frozen', ySplit: 1 }]

  // Row 1 par filter dropdown
  if (enableFilter && headers.length) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    }
  }

  // Auto column width
  ws.columns.forEach((col) => {
    let max = 10
    col.eachCell({ includeEmpty: false }, (cell) => {
    max = Math.max(max, String(cell.value ?? '').length + 5)
    })
    col.width = Math.min(max, 60)
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

const url = URL.createObjectURL(blob)
const anchor = document.createElement('a')
anchor.href = url
anchor.download = normalizeExportFileName(filename)
anchor.click()
URL.revokeObjectURL(url)
}