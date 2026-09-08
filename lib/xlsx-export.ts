import * as XLSX from 'xlsx-js-style'

// A designed Excel export: brand title bar, styled header row, zebra rows,
// borders, money formatting and auto column widths — RTL. Shared by the donor
// and fundraiser exports so every sheet the system produces looks the same.

export interface ExportColumn<T> {
  header: string
  get: (row: T) => string | number | null | undefined
  width?: number          // character width (auto-computed when omitted)
  money?: boolean         // render as a ₪ number with thousands separators
  align?: 'right' | 'left' | 'center'
}

const BRAND = '2563EB'
const HEADER_FG = 'FFFFFF'
const ZEBRA = 'F1F5F9'
const BORDER = 'E2E8F0'
const TITLE_BG = '0F172A'

const thin = { style: 'thin' as const, color: { rgb: BORDER } }
const allBorders = { top: thin, bottom: thin, left: thin, right: thin }

export function exportStyledXlsx<T>(opts: {
  filename: string
  sheetName?: string
  title: string
  subtitle?: string
  columns: ExportColumn<T>[]
  rows: T[]
}) {
  const { columns, rows } = opts
  const nCols = columns.length
  const lastCol = nCols - 1

  // ── build the grid as array-of-arrays: title, subtitle, header, data ──
  const aoa: (string | number | null)[][] = []
  aoa.push([opts.title, ...Array(nCols - 1).fill(null)])
  aoa.push([opts.subtitle || '', ...Array(nCols - 1).fill(null)])
  aoa.push(columns.map(c => c.header))
  for (const r of rows) aoa.push(columns.map(c => {
    const v = c.get(r)
    return v == null ? '' : v
  }))

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const dataStart = 3 // 0-based row index where data begins

  // merges for the title + subtitle bars across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]

  // row heights: taller title
  ws['!rows'] = [{ hpt: 30 }, { hpt: 18 }, { hpt: 22 }]

  // column widths
  ws['!cols'] = columns.map(c => {
    if (c.width) return { wch: c.width }
    let max = c.header.length
    for (const r of rows) { const v = c.get(r); const len = v == null ? 0 : String(v).length; if (len > max) max = len }
    return { wch: Math.min(Math.max(max + 2, 10), 60) }
  })

  // freeze the header row so it stays visible while scrolling
  ws['!freeze'] = { xSplit: '0', ySplit: '3', topLeftCell: 'A4', activePane: 'bottomLeft', state: 'frozen' } as unknown as XLSX.WorkSheet['!freeze']

  const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
    const addr = XLSX.utils.encode_cell({ r, c })
    const cell = ws[addr]
    if (cell) cell.s = style
  }

  // title bar
  setStyle(0, 0, { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: TITLE_BG } }, alignment: { horizontal: 'right', vertical: 'center' } })
  setStyle(1, 0, { font: { sz: 11, color: { rgb: '94A3B8' } }, fill: { patternType: 'solid', fgColor: { rgb: TITLE_BG } }, alignment: { horizontal: 'right', vertical: 'center' } })

  // header row
  for (let c = 0; c < nCols; c++) {
    setStyle(2, c, {
      font: { bold: true, sz: 11, color: { rgb: HEADER_FG } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: allBorders,
    })
  }

  // data rows
  for (let i = 0; i < rows.length; i++) {
    const r = dataStart + i
    const zebra = i % 2 === 1
    for (let c = 0; c < nCols; c++) {
      const col = columns[c]
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      const style: Record<string, unknown> = {
        alignment: { horizontal: col.align || (col.money ? 'left' : 'right'), vertical: 'center' },
        border: allBorders,
        font: { sz: 11, color: { rgb: '0F172A' } },
      }
      if (zebra) style.fill = { patternType: 'solid', fgColor: { rgb: ZEBRA } }
      if (col.money && cell && typeof cell.v === 'number') {
        cell.t = 'n'
        cell.z = '#,##0" ₪"'
        style.numFmt = '#,##0" ₪"'
      }
      if (cell) cell.s = style
    }
  }

  const wb = XLSX.utils.book_new()
  wb.Workbook = { Views: [{ RTL: true }] }   // right-to-left sheet view
  XLSX.utils.book_append_sheet(wb, ws, (opts.sheetName || 'גיליון').slice(0, 31))
  XLSX.writeFile(wb, opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`)
}
