import assert from 'node:assert';
import { describe, it } from 'node:test';
import { wrapPdfTableRow } from './pdf.layout';

describe('wrapPdfTableRow', () => {
  it('wraps cells in nested table with colspan', () => {
    const html = wrapPdfTableRow('<td>A</td><td>B</td>', 7, 'pdf-row');
    assert.match(html, /class="pdf-row"/);
    assert.match(html, /colspan="7"/);
    assert.match(html, /class="pdf-row-table"/);
    assert.match(html, /<td>A<\/td><td>B<\/td>/);
  });

  it('supports totals row class', () => {
    const html = wrapPdfTableRow('<td>Totals</td>', 4, 'totals-row section-total-row');
    assert.match(html, /class="totals-row section-total-row"/);
  });
});
