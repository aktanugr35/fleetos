/** Chromium PDF cannot reliably avoid breaks inside <tr>; wrap each row in an inner table. */
export function wrapPdfTableRow(cellsHtml: string, colSpan: number, rowClass = 'pdf-row'): string {
  return `
    <tr class="${rowClass}">
      <td colspan="${colSpan}" class="pdf-row-wrap">
        <table class="pdf-row-table">
          <tr>${cellsHtml}</tr>
        </table>
      </td>
    </tr>
  `;
}
