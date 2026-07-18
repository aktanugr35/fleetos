import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { formatMoneyCents } from '../../utils/money';
import { launchPdfBrowser, PDF_PAGE_TIMEOUT_MS } from '../../utils/puppeteer';
import { SETTLEMENTS_DIR, resolveUploadUrl } from '../../config/paths';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export class DispatcherPdfService {
  resolvePdfFilePath(pdfUrl: string): string {
    return resolveUploadUrl(pdfUrl);
  }

  async getPdfFile(settlementId: string, tenantId: string) {
    const settlement = await prisma.dispatcherSettlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
      select: { pdfUrl: true, statementNumber: true },
    });
    if (!settlement) {
      throw new AppError(404, 'DISPATCHER_SETTLEMENT_NOT_FOUND', 'Dispatcher settlement not found');
    }
    if (!settlement.pdfUrl) {
      throw new AppError(404, 'PDF_NOT_FOUND', 'PDF has not been generated yet');
    }

    const filepath = this.resolvePdfFilePath(settlement.pdfUrl);
    if (!fs.existsSync(filepath)) {
      throw new AppError(404, 'PDF_NOT_FOUND', 'PDF file is missing on server');
    }

    const safeName = (settlement.statementNumber || settlementId).replace(/[^\w.-]+/g, '_');
    return { filepath, filename: `dispatcher_settlement_${safeName}.pdf` };
  }

  async generatePdf(settlementId: string, tenantId?: string): Promise<string> {
    const settlement = await prisma.dispatcherSettlement.findFirst({
      where: {
        id: settlementId,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        company: true,
        dispatcher: true,
        lines: { include: { load: true } },
      },
    });

    if (!settlement) {
      throw new AppError(404, 'DISPATCHER_SETTLEMENT_NOT_FOUND', 'Dispatcher settlement not found');
    }

    const fMoney = formatMoneyCents;
    const fDate = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const commissionPct = (settlement.dispatcher.commissionRate / 100).toFixed(2);
    const dispatcherName = `${settlement.dispatcher.firstName} ${settlement.dispatcher.lastName}`;
    const workPeriod = `${fDate(settlement.periodStart)} – ${fDate(settlement.periodEnd)}`;
    const statementNo = settlement.statementNumber || 'N/A';

    const loadsHtml = settlement.lines
      .map((line) => {
        const load = line.load;
        return `<tr>
          <td>${esc(load.loadNumber)}</td>
          <td>${esc(load.brokerName)}</td>
          <td>${esc(load.pickupLocation)}<div class="sub">${fDate(load.pickupDate)}</div></td>
          <td>${esc(load.deliveryLocation)}<div class="sub">${load.deliveryDate ? fDate(load.deliveryDate) : '—'}</div></td>
          <td class="num">${fMoney(line.grossAmount)}</td>
          <td class="num">${commissionPct}%</td>
          <td class="num bold">${fMoney(line.netAmount)}</td>
        </tr>`;
      })
      .join('');

    const statusNote =
      settlement.status === 'FINALIZED' || settlement.status === 'PAID'
        ? `${settlement.status}${settlement.finalizedAt ? ` · ${fDate(settlement.finalizedAt)}` : ''}`
        : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 8pt;
    line-height: 1.35;
    color: #1e293b;
    margin: 0;
    padding: 0;
  }
  .title-bar {
    border-bottom: 2px solid #334155;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .title-bar h1 {
    font-size: 11pt;
    font-weight: 700;
    margin: 0 0 2px;
    letter-spacing: 0.02em;
    color: #0f172a;
  }
  .title-bar .sub {
    font-size: 7.5pt;
    color: #64748b;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-bottom: 8px;
    padding: 6px 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  .summary-item .lbl {
    display: block;
    font-size: 6.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    margin-bottom: 1px;
  }
  .summary-item .val {
    font-size: 9pt;
    font-weight: 700;
    color: #0f172a;
  }
  .summary-item.payout .val {
    font-size: 10pt;
    color: #0369a1;
  }
  .sec h2 {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #334155;
    background: #f1f5f9;
    padding: 3px 6px;
    margin: 0 0 4px;
    border-left: 3px solid #475569;
  }
  table.compact {
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
    table-layout: fixed;
  }
  table.compact th {
    background: #e2e8f0;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 3px 4px;
    border: 1px solid #cbd5e1;
  }
  table.compact td {
    padding: 3px 4px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    word-break: break-word;
  }
  table.compact tr.totals td {
    background: #f1f5f9;
    font-weight: 700;
    border-top: 2px solid #94a3b8;
  }
  .sub { color: #64748b; font-size: 6.5pt; margin-top: 1px; }
  .num { text-align: right; white-space: nowrap; }
  .bold { font-weight: 700; }
  .footer {
    margin-top: 8px;
    padding-top: 5px;
    border-top: 1px solid #cbd5e1;
    font-size: 6.5pt;
    color: #64748b;
    text-align: center;
  }
</style></head><body>
  <div class="title-bar">
    <h1>Dispatcher Commission Statement</h1>
    <div class="sub">${esc(dispatcherName)} · ${esc(settlement.company.name)} · ${commissionPct}% commission · ${esc(workPeriod)}</div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <span class="lbl">Statement #</span>
      <span class="val">${esc(statementNo)}</span>
    </div>
    <div class="summary-item">
      <span class="lbl">Loads</span>
      <span class="val">${settlement.lines.length}</span>
    </div>
    <div class="summary-item">
      <span class="lbl">Total Gross</span>
      <span class="val">${fMoney(settlement.grossAmount)}</span>
    </div>
    <div class="summary-item payout">
      <span class="lbl">Payout</span>
      <span class="val">${fMoney(settlement.netAmount)}</span>
    </div>
  </div>

  <section class="sec">
    <h2>Booked Loads</h2>
    <table class="compact">
      <thead>
        <tr>
          <th style="width:11%">Load</th>
          <th style="width:12%">Broker</th>
          <th style="width:22%">Origin</th>
          <th style="width:22%">Destination</th>
          <th style="width:11%" class="num">Gross</th>
          <th style="width:8%" class="num">Rate</th>
          <th style="width:14%" class="num">Commission</th>
        </tr>
      </thead>
      <tbody>
        ${loadsHtml}
        <tr class="totals">
          <td colspan="4">Totals</td>
          <td class="num">${fMoney(settlement.grossAmount)}</td>
          <td></td>
          <td class="num">${fMoney(settlement.netAmount)}</td>
        </tr>
      </tbody>
    </table>
  </section>

  ${statusNote ? `<div class="footer">${esc(statusNote)}</div>` : ''}
</body></html>`;

    if (settlement.pdfUrl) {
      try {
        const previous = this.resolvePdfFilePath(settlement.pdfUrl);
        if (fs.existsSync(previous)) fs.unlinkSync(previous);
      } catch {
        // ignore cleanup errors
      }
    }

    const pdfBuffer = await this.htmlToPdfBuffer(htmlContent);
    if (!fs.existsSync(SETTLEMENTS_DIR)) {
      fs.mkdirSync(SETTLEMENTS_DIR, { recursive: true });
    }

    const filename = `dispatcher_${settlement.statementNumber || settlementId}_${Date.now()}.pdf`;
    const filepath = path.join(SETTLEMENTS_DIR, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const pdfUrl = `/uploads/settlements/${filename}`;
    await prisma.dispatcherSettlement.update({
      where: { id: settlementId },
      data: { pdfUrl },
    });

    return pdfUrl;
  }

  private async htmlToPdfBuffer(htmlContent: string): Promise<Buffer> {
    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(PDF_PAGE_TIMEOUT_MS);
      await page.emulateMediaType('print');
      await page.setContent(htmlContent, { waitUntil: 'load', timeout: PDF_PAGE_TIMEOUT_MS });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
        preferCSSPageSize: true,
      });
      await page.close();
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

export const dispatcherPdfService = new DispatcherPdfService();
