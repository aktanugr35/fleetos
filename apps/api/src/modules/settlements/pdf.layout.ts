/**
 * Wraps a table row so Chromium/Puppeteer keeps it on one page.
 * Uses a nested single-row table inside a colspan cell — the inner table
 * cannot split across pages.
 */
export function wrapPdfTableRow(cellsHtml: string, colSpan: number, rowClass = 'pdf-row'): string {
  return `<tr class="${rowClass}"><td colspan="${colSpan}" class="pdf-row-cell"><table class="pdf-row-table"><tbody><tr>${cellsHtml}</tr></tbody></table></td></tr>`;
}

/** Wraps a section title + table so the title stays with the table header. */
export function pdfSection(title: string, tableHtml: string): string {
  return `<div class="pdf-section"><div class="section-title">${title}</div>${tableHtml}</div>`;
}
