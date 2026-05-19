/**
 * Dev-only: generate a sample settlement PDF for layout QA.
 * Requires demo data (`SEED_DEMO=true` then `pnpm db:seed`).
 * Run from repo root: `pnpm dev:sample-pdf`
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import fs from 'fs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Generating a highly detailed PDF statement matching the requested layout...');

  const company = await prisma.company.findFirst();
  if (!company) throw new Error('No company found');

  const driver = await prisma.driver.findFirst({
    where: { companyId: company.id, driverType: 'OWNER_OPERATOR' },
    include: { truck: true }
  });
  if (!driver) throw new Error('No owner-operator driver found');

  const truck = driver.truck || await prisma.truck.findFirst({ where: { companyId: company.id } });
  
  // Custom specific data for the statement to match the layout deeply
  const statementNo = "96";
  const payrollId = "2026-17";
  const workPeriod = "Apr 20-Apr 26, 2026";
  const totalTrips = 5;
  const totalDeadhead = "0.00";
  const totalLoaded = "4,705.00";
  const totalMiles = "4,705.00";

  const totalTripGross = "$12,730.00";
  const earning = "$11,202.40";
  const reimbursement = "$184.94";
  const fuelTransactions = "$2,075.42";
  const tollTransactions = "$52.33";
  const deductionsAmt = "$550.00";
  const payout = "$8,709.59";

  const driverName = "Anil Aktan";
  const address1 = "6509 BROADWAY APT 1";
  const address2 = "WEST NEW YORK,, NJ 07093";
  const llcName = "AKTAN LLC";
  const type = "Owner Operator/Solo";
  const percent = "Percent 88%";
  const truckId = "ANIL777";

  const compName = "Delo Trans Inc.";
  const compAddr1 = "636 N Irwin St";
  const compAddr2 = "Dayton, OH 45403";
  const compPhone = "5135940602";

  // Trips data
  const trips = [
    {
      id: "72529", subId: "22786599",
      origin: "Appling, GA", originDate: "Apr 20 2026 16:00 EDT",
      dest: "Appling, GA", destDate: "Apr 21 2026 16:00 EDT",
      mileage: "1,375.00 mi", milSub: "DHD: 0.00 mi/LDD: 1,375.00 mi",
      rate: "$3,900.00", rateSub: "$2.836 /mi",
      contract: "Percent 88%", contractSub: "N/A",
      net: "$3,432.00"
    },
    {
      id: "72864", subId: "5000113542",
      origin: "West Columbia, SC", originDate: "Apr 23 2026 00:30 EDT",
      dest: "Indianapolis, IN", destDate: "Apr 23 2026 13:45 EDT",
      mileage: "627.00 mi", milSub: "DHD: 0.00 mi/LDD: 627.00 mi",
      rate: "$1,630.00", rateSub: "$2.60 /mi",
      contract: "Percent 88%", contractSub: "N/A",
      net: "$1,434.40"
    },
    {
      id: "72865", subId: "5000113543",
      origin: "Indianapolis, IN", originDate: "Apr 23 2026 16:45 EDT",
      dest: "Charlotte, NC", destDate: "Apr 24 2026 05:15 EDT",
      mileage: "700.00 mi", milSub: "DHD: 0.00 mi/LDD: 700.00 mi",
      rate: "$1,800.00", rateSub: "$2.571 /mi",
      contract: "Percent 88%", contractSub: "N/A",
      net: "$1,584.00"
    },
    {
      id: "73004", subId: "211368",
      origin: "Nebo, NC", originDate: "Apr 24 2026 00:00 EDT",
      dest: "Nebo, NC", destDate: "Apr 25 2026 00:00 EDT",
      mileage: "760.00 mi", milSub: "DHD: 0.00 mi/LDD: 760.00 mi",
      rate: "$2,200.00", rateSub: "$2.895 /mi",
      contract: "Percent 88%", contractSub: "N/A",
      net: "$1,936.00"
    },
    {
      id: "73142", subId: "22841839",
      origin: "Appling, GA", originDate: "Apr 26 2026 08:00 EDT",
      dest: "Appling, GA", destDate: "Apr 28 2026 16:00 EDT",
      mileage: "1,243.00 mi", milSub: "DHD: 0.00 mi/LDD: 1,243.00 mi",
      rate: "$3,200.00", rateSub: "$2.574 /mi",
      contract: "Percent 88%", contractSub: "N/A",
      net: "$2,816.00"
    }
  ];

  const fuels = [
    { type: "Diesel", date: "04/20/2026 12:00 AM", loc: "AUGUSTA, GA", locSub: "PILOT 144", qty: "133.12 gal", dAmnt: "$713.41", rQty: "0.00 gal", rAmnt: "$0.00", def: "$0.00", fee: "$0.00", total: "$713.41", disc: "$188.05", pay: "$525.36" },
    { type: "Diesel", date: "04/20/2026 12:00 AM", loc: "ROCK HILL, SC", locSub: "FJ-ROCK HILL 714", qty: "25.92 gal", dAmnt: "$144.09", rQty: "0.00 gal", rAmnt: "$0.00", def: "$0.00", fee: "$0.00", total: "$144.09", disc: "$38.69", pay: "$105.40" },
    { type: "Diesel", date: "04/23/2026 12:00 AM", loc: "NITRO, WV", locSub: "PILOT NITRO 243", qty: "52.65 gal", dAmnt: "$289.53", rQty: "0.00 gal", rAmnt: "$0.00", def: "$0.00", fee: "$0.00", total: "$289.53", disc: "$53.99", pay: "$235.54" },
    { type: "Diesel", date: "04/24/2026 12:00 AM", loc: "KNOXVILLE, TN", locSub: "PILOT 219", qty: "33.03 gal", dAmnt: "$184.94", rQty: "0.00 gal", rAmnt: "$0.00", def: "$0.00", fee: "$0.00", total: "$184.94", disc: "$35.10", pay: "$149.84" },
    { type: "Diesel", date: "04/24/2026 12:00 AM", loc: "KNOXVILLE, TN", locSub: "PILOT 219", qty: "103.77 gal", dAmnt: "$580.99", rQty: "0.00 gal", rAmnt: "$0.00", def: "$0.00", fee: "$0.00", total: "$580.99", disc: "$110.25", pay: "$470.74" },
    { type: "Diesel", date: "04/26/2026 12:00 AM", loc: "UNION POINT, GA", locSub: "FJ-SILOAM 633", qty: "132.01 gal", dAmnt: "$719.32", rQty: "0.00 gal", rAmnt: "$0.00", def: "$0.00", fee: "$0.00", total: "$719.32", disc: "$130.78", pay: "$588.54" }
  ];

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
            
            .header-right { display: flex; gap: 15px; text-align: right; }
            .header-right-text h1 { font-size: 16px; margin: 0 0 5px 0; font-weight: bold; }
            .header-right-text p { margin: 2px 0; font-size: 11px; }
            
            .logo-placeholder { font-size: 24px; font-weight: 900; color: #0284c7; font-style: italic; text-align: center; line-height: 1; }
            .logo-placeholder span { font-size: 10px; color: #ef4444; font-style: normal; display: block; margin-top: 2px; }
            
            .summary-section { border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 15px 0; display: flex; margin-bottom: 25px; }
            .summary-col-1 { width: 30%; border-right: 1px solid #e2e8f0; padding-right: 15px; }
            .summary-col-2 { width: 35%; border-right: 1px solid #e2e8f0; padding: 0 15px; }
            .summary-col-3 { width: 35%; padding-left: 15px; }
            
            .row-flex { display: flex; justify-content: space-between; margin-bottom: 4px; }
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
                <h1>${driverName}</h1>
                <p>${address1}</p>
                <p>${address2}</p>
                <h2>${llcName}</h2>
                <p>${type}</p>
                <p>${percent}</p>
                <p style="margin-top: 8px;">Truck <span class="badge">${truckId}</span></p>
            </div>
            <div class="header-right">
                <div class="header-right-text">
                    <h1>${compName}</h1>
                    <p>${compAddr1}</p>
                    <p>${compAddr2}</p>
                    <p>${compPhone}</p>
                </div>
                <div class="logo-placeholder">
                    DELO
                    <span>TRANS INC</span>
                </div>
            </div>
        </div>

        <div class="summary-section">
            <div class="summary-col-1">
                <div class="row-flex">
                    <span>Depository Fund</span>
                    <span><span class="text-green">$2,500.00</span> / <span class="text-orange">$0.00</span></span>
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
                    <span>${totalDeadhead}</span>
                </div>
                <div class="row-flex">
                    <span>Total Loaded</span>
                    <span>${totalLoaded}</span>
                </div>
                <div class="row-flex">
                    <span>Total Miles</span>
                    <span>${totalMiles}</span>
                </div>
            </div>
            <div class="summary-col-3">
                <div class="row-flex">
                    <span>Total Trip Gross</span>
                    <span>${totalTripGross}</span>
                </div>
                <div class="row-flex">
                    <span>Earning</span>
                    <span>${earning}</span>
                </div>
                <div class="row-flex">
                    <span>Reimbursement</span>
                    <span>${reimbursement}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Fuel Transactions</span>
                    <span>${fuelTransactions}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Toll Transactions</span>
                    <span>${tollTransactions}</span>
                </div>
                <div class="row-flex text-red">
                    <span>Deductions</span>
                    <span>${deductionsAmt}</span>
                </div>
                <div class="row-flex font-large" style="margin-top: 5px;">
                    <span>Payout</span>
                    <span>${payout}</span>
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
                ${trips.map(t => `
                <tr>
                    <td>
                        ${t.id}
                        <div class="sub-text">${t.subId}</div>
                    </td>
                    <td>
                        ${t.origin}
                        <div class="sub-text">${t.originDate}</div>
                    </td>
                    <td>
                        ${t.dest}
                        <div class="sub-text">${t.destDate}</div>
                    </td>
                    <td>
                        ${t.mileage}
                        <div class="sub-text">${t.milSub.replace('mi/LDD:', 'mi/LDD:<br>')}</div>
                    </td>
                    <td>
                        <span class="font-bold">${t.rate}</span>
                        <div class="sub-text">${t.rateSub}</div>
                    </td>
                    <td>
                        ${t.contract}
                        <div class="sub-text">${t.contractSub}</div>
                    </td>
                    <td class="text-right font-bold">${t.net}</td>
                </tr>
                `).join('')}
                <tr class="totals-row">
                    <td>Totals:</td>
                    <td></td>
                    <td></td>
                    <td>${totalMiles} mi</td>
                    <td>${totalTripGross}</td>
                    <td></td>
                    <td class="text-right">${earning}</td>
                </tr>
            </tbody>
        </table>

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
                <tr>
                    <td>Reefer</td>
                    <td><span class="badge-green">Reimbursement</span></td>
                    <td>04/20/2026</td>
                    <td class="text-right font-bold">$184.94</td>
                </tr>
                <tr class="totals-row">
                    <td>Totals:</td>
                    <td></td>
                    <td></td>
                    <td class="text-right">$184.94</td>
                </tr>
            </tbody>
        </table>

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
                ${fuels.map(f => `
                <tr>
                    <td>${f.type}</td>
                    <td>${f.date.replace(' ', '<br>')}</td>
                    <td>
                        ${f.loc}
                        <div class="sub-text">${f.locSub}</div>
                    </td>
                    <td>${f.qty.replace(' ', '<br>')}</td>
                    <td>${f.dAmnt}</td>
                    <td>${f.rQty.replace(' ', '<br>')}</td>
                    <td>${f.rAmnt}</td>
                    <td>${f.def}</td>
                    <td class="text-red">${f.fee}</td>
                    <td>${f.total}</td>
                    <td class="text-green">${f.disc}</td>
                    <td class="text-right font-bold">${f.pay}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

    </body>
    </html>
  `;

  console.log('📄 Generating detailed PDF with Puppeteer...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
  await browser.close();

  const outDir = path.join(repoRoot, 'docs/samples');
  fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, 'sample_statement_anil_aktan.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);

  console.log(`🎉 Detailed PDF successfully generated at: ${pdfPath}`);
}

main()
  .catch((e) => {
    console.error('Error generating PDF:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
