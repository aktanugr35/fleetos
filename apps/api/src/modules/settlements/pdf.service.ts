import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler.middleware';
import { formatMoneyCents } from '../../utils/money';
import { launchPdfBrowser, PDF_PAGE_TIMEOUT_MS } from '../../utils/puppeteer';
import { logger } from '../../utils/logger';
import { buildCompanyLogoHtml } from '../../utils/companyLogo';
import { SETTLEMENTS_DIR, resolveUploadUrl } from '../../config/paths';
import { getLoadMiles, sumSettlementLineMiles } from './pdf.miles';

export class PdfService {
  resolvePdfFilePath(pdfUrl: string): string {
    return resolveUploadUrl(pdfUrl);
  }

  async getSettlementPdfFile(settlementId: string, tenantId: string) {
    const settlement = await prisma.settlement.findFirst({
      where: { id: settlementId, companyId: tenantId },
      select: { pdfUrl: true, statementNumber: true },
    });
    if (!settlement) {
      throw new AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    }
    if (!settlement.pdfUrl) {
      throw new AppError(404, 'PDF_NOT_FOUND', 'PDF has not been generated yet');
    }

    const filepath = this.resolvePdfFilePath(settlement.pdfUrl);
    if (!fs.existsSync(filepath)) {
      throw new AppError(404, 'PDF_NOT_FOUND', 'PDF file is missing on server');
    }

    const safeName = (settlement.statementNumber || settlementId).replace(/[^\w.-]+/g, '_');
    return {
      filepath,
      filename: `settlement_${safeName}.pdf`,
    };
  }

  async generateSettlementPdf(settlementId: string, tenantId?: string): Promise<string> {
    const settlement = await prisma.settlement.findFirst({
      where: {
        id: settlementId,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        company: true,
        driver: { include: { truck: true } },
        lines: { include: { load: true } },
        deductions: { include: { deduction: true } },
        credits: { include: { credit: true } },
        fuelTransactions: { include: { fuelTransaction: { include: { fuelCard: true, truck: true } } } },
        tollTransactions: { include: { tollTransaction: { include: { tollDevice: true, truck: true } } } },
      }
    });

    if (!settlement) {
      throw new AppError(404, 'SETTLEMENT_NOT_FOUND', 'Settlement not found');
    }

    const { driver } = settlement;
    const truck = driver.truck;

    const company = await prisma.company.findUnique({
      where: { id: settlement.companyId },
      select: { name: true, address: true, phone: true, logoUrl: true },
    });
    if (!company) {
      throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
    }

    const fMoney = formatMoneyCents;
    const fDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fDateTime = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

    const statementNo = settlement.statementNumber || 'N/A';
    const payrollId = settlement.payrollId || 'N/A';
    const workPeriod = `${fDate(settlement.periodStart)} - ${fDate(settlement.periodEnd)}`;
    const totalTrips = settlement.lines.length;

    const formatPayRate = () => {
      if (driver.payStructure === 'PERCENTAGE') {
        return `${(driver.payRate / 100).toFixed(0)}%`;
      }
      if (driver.payStructure === 'PER_MILE') {
        return `$${(driver.payRate / 100).toFixed(2)}/mi`;
      }
      return fMoney(driver.payRate);
    };

    const formatCommissionLabel = (rateHundredths: number) => {
      if (driver.payStructure === 'PERCENTAGE') {
        return `Percent ${(rateHundredths / 100).toFixed(0)}%`;
      }
      if (driver.payStructure === 'PER_MILE') {
        return `$${(rateHundredths / 100).toFixed(2)}/mi`;
      }
      return 'Fixed';
    };

    const mileTotals = sumSettlementLineMiles(
      settlement.lines.map((line) => line.load),
    );
    const { totalDeadheadMiles, totalLoadedMiles, totalMilesCount } = mileTotals;

    const tripsHtml = settlement.lines.map(line => {
      const load = line.load;
      const { loadedMiles, deadheadMiles, totalMiles } = getLoadMiles(load);

      const rpmBaseMiles = loadedMiles > 0 ? loadedMiles : totalMiles;
      const ratePerMile = rpmBaseMiles > 0
        ? (line.grossAmount / rpmBaseMiles / 100).toFixed(3)
        : '0.000';

      return `
        <tr>
            <td>
                ${load.loadNumber}
                <div class="sub-text">${load.referenceNumber || 'N/A'}</div>
            </td>
            <td>
                ${load.pickupLocation}
                <div class="sub-text">${fDateTime(load.pickupDate)}</div>
            </td>
            <td>
                ${load.deliveryLocation}
                <div class="sub-text">${load.deliveryDate ? fDateTime(load.deliveryDate) : 'N/A'}</div>
            </td>
            <td>
                ${totalMiles.toFixed(2)} mi
                <div class="sub-text">DHD: ${deadheadMiles.toFixed(2)} mi<br>LDD: ${loadedMiles.toFixed(2)} mi</div>
            </td>
            <td>
                <span class="font-bold">${fMoney(line.grossAmount)}</span>
                <div class="sub-text">$${ratePerMile} /mi</div>
            </td>
            <td>
                ${formatCommissionLabel(line.commissionRate)}
                <div class="sub-text">${company.name}</div>
            </td>
            <td class="text-right font-bold">${fMoney(line.netAmount)}</td>
        </tr>
      `;
    }).join('');

    const totalTripGross = settlement.lines.reduce((sum, l) => sum + l.grossAmount, 0);
    const earning = settlement.lines.reduce((sum, l) => sum + l.netAmount, 0);

    // DEDUCTIONS -> separate fuel, toll, company fee, and true deductions.
    const legacyFuels = settlement.deductions.filter(d => d.deduction.type === 'FUEL');
    const legacyTolls = settlement.deductions.filter(d => d.deduction.type === 'TOLL');
    const companyFees = settlement.deductions.filter(d => d.deduction.type === 'COMPANY_FEE');
    const trueDeductions = settlement.deductions.filter(d => !['FUEL', 'TOLL', 'COMPANY_FEE'].includes(d.deduction.type));

    const fuelTransactionsHtml = [
      ...settlement.fuelTransactions.map(f => {
        const tx = f.fuelTransaction;
        const qty = tx.gallons || 0;
        const gross = tx.grossAmount;
        const discount = tx.discount;
        const net = f.amount;
        return `
          <tr>
              <td>Diesel</td>
              <td>${tx.date.toLocaleDateString()}<br>${tx.date.toLocaleTimeString()}</td>
              <td>
                  ${tx.merchant || tx.fuelCard.displayName || tx.fuelCard.provider || 'Fuel Card'}
                  <div class="sub-text">Truck ${tx.truck.unitNumber}${tx.reference ? ` · ${tx.reference}` : ''}</div>
              </td>
              <td>${qty ? `${qty} gal` : '—'}</td>
              <td>${fMoney(gross)}</td>
              <td>0.00 gal</td>
              <td>${fMoney(0)}</td>
              <td>${fMoney(0)}</td>
              <td class="text-red">${fMoney(0)}</td>
              <td>${fMoney(gross)}</td>
              <td class="text-green">${discount > 0 ? fMoney(discount) : fMoney(0)}</td>
              <td class="text-right font-bold">${fMoney(net)}</td>
          </tr>
        `;
      }),
      ...legacyFuels.map(f => {
      const d = f.deduction;
      const metadata: Record<string, number | string | undefined> =
        (d.metadata as Record<string, number | string | undefined>) || {};
      const qty = Number(metadata.gallons) || 0;
      const discount = Number(metadata.discount) || 0;
      const gross = Number(metadata.grossAmount) || f.amount + discount;
      const net = f.amount;

      return `
        <tr>
            <td>Diesel</td>
            <td>${d.date.toLocaleDateString()}<br>${d.date.toLocaleTimeString()}</td>
            <td>
                ${metadata.merchant || 'Fuel Stop'}
                <div class="sub-text">${d.description}</div>
            </td>
            <td>${qty ? `${qty} gal` : '—'}</td>
            <td>${fMoney(gross)}</td>
            <td>0.00 gal</td>
            <td>${fMoney(0)}</td>
            <td>${fMoney(0)}</td>
            <td class="text-red">${fMoney(0)}</td>
            <td>${fMoney(gross)}</td>
            <td class="text-green">${discount > 0 ? fMoney(discount) : fMoney(0)}</td>
            <td class="text-right font-bold">${fMoney(net)}</td>
        </tr>
      `;
      }),
    ].join('');

    const tollTransactionsHtml = [
      ...settlement.tollTransactions.map(t => {
        const tx = t.tollTransaction;
        return `
          <tr>
              <td>${tx.date.toLocaleDateString()}</td>
              <td>${tx.agency || tx.tollDevice.provider || 'Toll'}</td>
              <td>${tx.location || tx.description || '—'}<div class="sub-text">Truck ${tx.truck.unitNumber}${tx.reference ? ` · ${tx.reference}` : ''}</div></td>
              <td class="text-right font-bold">${fMoney(t.amount)}</td>
          </tr>
        `;
      }),
      ...legacyTolls.map(t => `
        <tr>
            <td>${t.deduction.date.toLocaleDateString()}</td>
            <td>Toll</td>
            <td>${t.deduction.description}</td>
            <td class="text-right font-bold">${fMoney(t.amount)}</td>
        </tr>
      `),
    ].join('');

    const deductionRowsHtml = trueDeductions.map(d => `
      <tr>
          <td>${d.deduction.type.replace('_', ' ')}</td>
          <td>${d.deduction.description}</td>
          <td>${d.deduction.date.toLocaleDateString()}</td>
          <td class="text-right font-bold">${fMoney(d.amount)}</td>
      </tr>
    `).join('');

    const fuelTotal =
      settlement.fuelTransactions.reduce((sum, f) => sum + f.amount, 0) +
      legacyFuels.reduce((sum, f) => sum + f.amount, 0);
    const tollTotal =
      settlement.tollTransactions.reduce((sum, t) => sum + t.amount, 0) +
      legacyTolls.reduce((sum, d) => sum + d.amount, 0);
    const companyFeeTotal = companyFees.reduce((sum, d) => sum + d.amount, 0);
    const deductionsTotal = trueDeductions.reduce((sum, d) => sum + d.amount, 0);
    
    // CREDITS
    const reimbursementsHtml = settlement.credits.map(c => {
        return `
            <tr>
                <td>${c.credit.description || c.credit.type}</td>
                <td><span class="badge-green">Reimbursement</span></td>
                <td>${c.credit.date.toLocaleDateString()}</td>
                <td class="text-right font-bold">${fMoney(c.amount)}</td>
            </tr>
        `;
    }).join('');

    const reimbursementTotal = settlement.credits.reduce((sum, c) => sum + c.amount, 0);

    const companyLogoHtml = buildCompanyLogoHtml(company.logoUrl, company.name);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', Helvetica, Arial, sans-serif; color: #111; line-height: 1.4; margin: 0; padding: 40px; font-size: 11px; }
            .header-top { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .header-left h1 { font-size: 18px; margin: 0 0 5px 0; font-weight: bold; }
            .header-left p { margin: 3px 0; font-size: 11px; }
            .header-left h2 { font-size: 16px; margin: 12px 0 5px 0; font-weight: bold; }
            .badge { display: inline-block; background: #0f172a; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-left: 5px; }
            
            .header-right { display: flex; justify-content: flex-end; align-items: flex-start; }
            .company-brand {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                width: 180px;
            }
            .logo-box {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                min-height: 72px;
                margin-bottom: 10px;
            }
            .company-details { width: 100%; }
            .company-details h1 {
                font-size: 16px;
                margin: 0 0 4px 0;
                font-weight: bold;
                line-height: 1.25;
            }
            .company-details p {
                margin: 2px 0;
                font-size: 11px;
                line-height: 1.35;
            }
            .company-logo {
                max-width: 160px;
                max-height: 72px;
                width: auto;
                height: auto;
                object-fit: contain;
                display: block;
                margin: 0 auto;
            }
            .logo-placeholder {
                font-size: 24px;
                font-weight: 900;
                color: #0284c7;
                font-style: italic;
                text-align: center;
                line-height: 1;
                margin: 0 auto;
            }
            .logo-placeholder span {
                font-size: 10px;
                color: #ef4444;
                font-style: normal;
                display: block;
                margin-top: 2px;
            }
            
            .summary-section { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 15px 0; display: flex; margin-bottom: 25px; }
            .summary-col-1 { width: 30%; border-right: 1px solid #e2e8f0; padding-right: 15px; }
            .summary-col-2 { width: 35%; border-right: 1px solid #e2e8f0; padding: 0 15px; }
            .summary-col-3 { width: 35%; padding-left: 15px; }
            
            .row-flex { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px; }
            .row-flex > span:first-child { flex: 1; min-width: 0; }
            .row-flex > span:last-child { flex-shrink: 0; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
            .summary-col-3 .row-flex > span:last-child { min-width: 88px; }
            .text-green { color: #16a34a; }
            .text-orange { color: #f59e0b; }
            .text-red { color: #dc2626; }
            .font-bold { font-weight: bold; }
            .font-large { font-size: 14px; font-weight: bold; }
            
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; margin-top: 25px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 10px; }
            th { border-bottom: 2px solid #94a3b8; color: #0284c7; font-weight: 500; text-align: left; padding: 8px 4px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 4px; vertical-align: top; }
            .text-right { text-align: right; }
            .sub-text { color: #64748b; font-size: 9px; margin-top: 2px; line-height: 1.2; }
            
            .totals-row { background: #e2e8f0; font-weight: bold; }
            .totals-row td { border-bottom: none; }
            
            .badge-green { background: #4ade80; color: white; padding: 2px 10px; border-radius: 12px; font-size: 9px; }
        </style>
    </head>
    <body>
        <div class="header-top">
            <div class="header-left">
                <h1>${driver.firstName} ${driver.lastName}</h1>
                <p>${driver.address || ''}</p>
                <p>${driver.city || ''}, ${driver.state || ''} ${driver.zip || ''}</p>
                <h2>${driver.llcName || ''}</h2>
                <p>${driver.driverType.replace('_', ' ')}</p>
                <p>${driver.payStructure.replace('_', ' ')} ${formatPayRate()}</p>
                <p style="margin-top: 8px;">Truck <span class="badge">${truck?.unitNumber || 'N/A'}</span></p>
            </div>
            <div class="header-right">
                <div class="company-brand">
                    <div class="logo-box">
                        ${companyLogoHtml}
                    </div>
                    <div class="company-details">
                        <h1>${company.name}</h1>
                        <p>${company.address || ''}</p>
                        <p>${company.phone || ''}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="summary-section">
            <div class="summary-col-1">
                <div class="row-flex">
                    <span>Deposit</span>
                    <span class="text-green font-bold">${fMoney(driver.escrowBalance ?? 0)}</span>
                </div>
            </div>
            <div class="summary-col-2">
                <div class="row-flex">
                    <span>Statement #</span>
                    <span>${statementNo}</span>
                </div>
                <div class="row-flex">
                    <span>Payroll ID</span>
                    <span>${payrollId}</span>
                </div>
                <div class="row-flex">
                    <span>Work Period</span>
                    <span>${workPeriod}</span>
                </div>
                <div class="row-flex">
                    <span>Total Trips</span>
                    <span>${totalTrips}</span>
                </div>
                <div class="row-flex">
                    <span>Total Deadhead</span>
                    <span>${totalDeadheadMiles.toFixed(2)}</span>
                </div>
                <div class="row-flex">
                    <span>Total Loaded</span>
                    <span>${totalLoadedMiles.toFixed(2)}</span>
                </div>
                <div class="row-flex">
                    <span>Total Miles</span>
                    <span>${totalMilesCount.toFixed(2)}</span>
                </div>
            </div>
            <div class="summary-col-3">
                <div class="row-flex">
                    <span>Total Trip Gross</span>
                    <span>${fMoney(totalTripGross)}</span>
                </div>
                <div class="row-flex">
                    <span>Earning</span>
                    <span>${fMoney(earning)}</span>
                </div>
                <div class="row-flex">
                    <span>Reimbursement</span>
                    <span>${fMoney(reimbursementTotal)}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Fuel Transactions</span>
                    <span>${fMoney(fuelTotal)}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Toll Transactions</span>
                    <span>${fMoney(tollTotal)}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Company Fee</span>
                    <span>${fMoney(companyFeeTotal)}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Deductions</span>
                    <span>${fMoney(deductionsTotal)}</span>
                </div>
                <div class="row-flex font-large" style="margin-top: 5px;">
                    <span>Payout</span>
                    <span>${fMoney(settlement.netAmount)}</span>
                </div>
            </div>
        </div>

        <div class="section-title">Trips & Credits</div>
        <table>
            <thead>
                <tr>
                    <th>Trips</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Mileage</th>
                    <th>Rate (Gross)</th>
                    <th>Contract</th>
                    <th class="text-right">Net Amount</th>
                </tr>
            </thead>
            <tbody>
                ${tripsHtml}
                <tr class="totals-row">
                    <td>Totals:</td>
                    <td></td>
                    <td></td>
                    <td>
                        ${totalMilesCount.toFixed(2)} mi
                        <div class="sub-text">DHD: ${totalDeadheadMiles.toFixed(2)} | LDD: ${totalLoadedMiles.toFixed(2)}</div>
                    </td>
                    <td>${fMoney(totalTripGross)}</td>
                    <td></td>
                    <td class="text-right">${fMoney(earning)}</td>
                </tr>
            </tbody>
        </table>

        ${settlement.credits.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Credits</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th class="text-right">Net Amount</th>
                </tr>
            </thead>
            <tbody>
                ${reimbursementsHtml}
                <tr class="totals-row">
                    <td>Totals:</td>
                    <td></td>
                    <td></td>
                    <td class="text-right">${fMoney(reimbursementTotal)}</td>
                </tr>
            </tbody>
        </table>
        ` : ''}

        ${fuelTotal > 0 ? `
        <div class="section-title">Fuel Transaction</div>
        <table>
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Date/Time</th>
                    <th>Merchant/Location</th>
                    <th>Qty</th>
                    <th>Diesel Amnt</th>
                    <th>Reefer Qty</th>
                    <th>Reefer Amnt</th>
                    <th>DEF</th>
                    <th>Fee</th>
                    <th>Total Amount</th>
                    <th>Discount</th>
                    <th class="text-right">Pay Amount</th>
                </tr>
            </thead>
            <tbody>
                ${fuelTransactionsHtml}
            </tbody>
        </table>
        ` : ''}

        ${tollTotal > 0 ? `
        <div class="section-title">Toll Transactions</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Agency</th>
                    <th>Location / Description</th>
                    <th class="text-right">Pay Amount</th>
                </tr>
            </thead>
            <tbody>
                ${tollTransactionsHtml}
                <tr class="totals-row">
                    <td>Totals:</td>
                    <td></td>
                    <td></td>
                    <td class="text-right">${fMoney(tollTotal)}</td>
                </tr>
            </tbody>
        </table>
        ` : ''}

        ${trueDeductions.length > 0 ? `
        <div class="section-title">Deductions</div>
        <table>
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${deductionRowsHtml}
                <tr class="totals-row">
                    <td>Totals:</td>
                    <td></td>
                    <td></td>
                    <td class="text-right">${fMoney(deductionsTotal)}</td>
                </tr>
            </tbody>
        </table>
        ` : ''}

    </body>
    </html>
    `;

    if (settlement.pdfUrl) {
      try {
        const previous = this.resolvePdfFilePath(settlement.pdfUrl);
        if (fs.existsSync(previous)) {
          fs.unlinkSync(previous);
        }
      } catch (err) {
        logger.warn('Could not remove previous settlement PDF', { err, settlementId });
      }
    }

    const pdfBuffer = await this.htmlToPdfBuffer(htmlContent);

    if (!fs.existsSync(SETTLEMENTS_DIR)) {
      fs.mkdirSync(SETTLEMENTS_DIR, { recursive: true });
    }

    const filename = `settlement_${statementNo}_${Date.now()}.pdf`;
    const filepath = path.join(SETTLEMENTS_DIR, filename);
    fs.writeFileSync(filepath, pdfBuffer);

    const pdfUrl = `/uploads/settlements/${filename}`;
    await prisma.settlement.update({
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

export const pdfService = new PdfService();
