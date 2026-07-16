import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { formatMoneyCents } from '../../utils/money';
import { launchPdfBrowser, PDF_PAGE_TIMEOUT_MS } from '../../utils/puppeteer';
import { buildCompanyLogoHtml } from '../../utils/companyLogo';
import { SETTLEMENTS_DIR, resolveUploadUrl } from '../../config/paths';
import { pdfSection, wrapPdfTableRow } from '../settlements/pdf.layout';

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

    const loadsHtml = settlement.lines.map((line) => {
      const load = line.load;
      return wrapPdfTableRow(`
        <td>${load.loadNumber}</td>
        <td>${load.brokerName}</td>
        <td>${load.pickupLocation}<div class="sub-text">${fDate(load.pickupDate)}</div></td>
        <td>${load.deliveryLocation}<div class="sub-text">${load.deliveryDate ? fDate(load.deliveryDate) : '—'}</div></td>
        <td>${fMoney(line.grossAmount)}</td>
        <td>${commissionPct}%</td>
        <td class="text-right font-bold">${fMoney(line.netAmount)}</td>
      `, 7);
    }).join('');

    const companyLogoHtml = buildCompanyLogoHtml(settlement.company.logoUrl, settlement.company.name);
    const workPeriod = `${fDate(settlement.periodStart)} - ${fDate(settlement.periodEnd)}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 40px; font-size: 11px; }
        .header-top { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .header-left h1 { font-size: 18px; margin: 0 0 5px 0; }
        .header-left p { margin: 3px 0; font-size: 11px; }
        .summary-section { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 15px 0; margin-bottom: 25px; }
        .row-flex { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .font-bold { font-weight: bold; }
        .font-large { font-size: 14px; font-weight: bold; }
        .pdf-section { margin-bottom: 28px; }
        .section-title { font-size: 14px; font-weight: bold; margin: 0 0 10px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
        th { border-bottom: 2px solid #94a3b8; color: #0284c7; text-align: left; padding: 8px 4px; }
        td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; vertical-align: top; }
        .text-right { text-align: right; }
        .sub-text { color: #64748b; font-size: 9px; margin-top: 2px; }
        .pdf-row, .pdf-row-table, .totals-row, .section-total-row { break-inside: avoid-page; page-break-inside: avoid; }
        .pdf-row-cell { padding: 0; border-bottom: none; }
        .pdf-row-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
        .pdf-row-table td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; }
        .totals-row { background: #e2e8f0; font-weight: bold; }
        .totals-row .pdf-row-table td { background: #e2e8f0; border-bottom: none; }
        .statement-footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 10px; color: #64748b; }
        .status-badge { display: inline-block; background: #16a34a; color: white; padding: 3px 12px; border-radius: 4px; font-weight: bold; margin-right: 8px; }
      </style>
    </head>
    <body>
      <div class="header-top">
        <div class="header-left">
          <h1>${settlement.dispatcher.firstName} ${settlement.dispatcher.lastName}</h1>
          <p>Dispatcher Commission Statement</p>
          <p>Commission Rate: ${commissionPct}%</p>
        </div>
        <div>${companyLogoHtml}<p class="font-bold">${settlement.company.name}</p></div>
      </div>
      <div class="summary-section">
        <div class="row-flex"><span>Statement #</span><span>${settlement.statementNumber || 'N/A'}</span></div>
        <div class="row-flex"><span>Work Period</span><span>${workPeriod}</span></div>
        <div class="row-flex"><span>Total Load Gross</span><span>${fMoney(settlement.grossAmount)}</span></div>
        <div class="row-flex font-large"><span>Payout</span><span>${fMoney(settlement.netAmount)}</span></div>
      </div>
      ${pdfSection('Booked Loads', `
        <table>
          <thead>
            <tr>
              <th>Load</th>
              <th>Broker</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Gross</th>
              <th>Rate</th>
              <th class="text-right">Commission</th>
            </tr>
          </thead>
          <tbody>
            ${loadsHtml}
            ${wrapPdfTableRow(`
              <td>Totals:</td>
              <td></td>
              <td></td>
              <td></td>
              <td>${fMoney(settlement.grossAmount)}</td>
              <td></td>
              <td class="text-right">${fMoney(settlement.netAmount)}</td>
            `, 7, 'totals-row section-total-row')}
          </tbody>
        </table>
      `)}
      ${settlement.status === 'FINALIZED' || settlement.status === 'PAID' ? `
        <div class="statement-footer">
          <span class="status-badge">${settlement.status}</span>
          Statement ${settlement.status === 'PAID' ? 'paid' : 'finalized'}${settlement.finalizedAt ? ` on ${fDate(settlement.finalizedAt)}` : ''}
        </div>
      ` : ''}
    </body>
    </html>
    `;

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
        margin: { top: '20px', bottom: '20px' },
      });
      await page.close();
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}

export const dispatcherPdfService = new DispatcherPdfService();
