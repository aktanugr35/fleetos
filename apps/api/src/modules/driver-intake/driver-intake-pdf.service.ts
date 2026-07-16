import type { DriverIntakeFormInput } from './driver-intake.schema';
import { launchPdfBrowser, PDF_PAGE_TIMEOUT_MS } from '../../utils/puppeteer';
import { buildCompanyLogoHtml } from '../../utils/companyLogo';

type CompanyInfo = {
  name: string;
  dotNumber: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
};

function esc(value: string | undefined | null): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function yn(value: string): string {
  return value === 'YES' ? 'Yes' : 'No';
}

function rows(items: string[][]): string {
  return items
    .map(
      ([label, value]) =>
        `<tr><td class="label">${esc(label)}</td><td>${esc(value)}</td></tr>`,
    )
    .join('');
}

export class DriverIntakePdfService {
  async generatePdfBuffer(company: CompanyInfo, form: DriverIntakeFormInput): Promise<Buffer> {
    const logo = buildCompanyLogoHtml(company.logoUrl ?? null, company.name);
    const submittedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const residencyHtml = form.residency
      .map(
        (r, i) => `
        <div class="block">
          <div class="block-title">Address ${i + 1}</div>
          <table class="kv">${rows([
            ['Street', r.street],
            ['City', r.city],
            ['State & Zip', `${r.state} ${r.zip}`],
            ['# Years', r.years],
          ])}</table>
        </div>`,
      )
      .join('');

    const experienceHtml =
      form.drivingExperience.length > 0
        ? `<table class="data">
          <thead><tr><th>Class</th><th>Equipment</th><th>From</th><th>To</th><th>Miles</th></tr></thead>
          <tbody>${form.drivingExperience
            .map(
              (e) =>
                `<tr><td>${esc(e.equipmentClass)}</td><td>${esc(e.equipmentType)}</td><td>${esc(e.dateFrom)}</td><td>${esc(e.dateTo)}</td><td>${esc(e.approxMiles)}</td></tr>`,
            )
            .join('')}</tbody></table>`
        : '<p class="muted">None reported</p>';

    const accidentsHtml = form.noAccidents
      ? '<p class="muted">No accidents reported in the past 3 years</p>'
      : `<table class="data">
          <thead><tr><th>Dates</th><th>Nature</th><th>Fatalities</th><th>Injuries</th><th>Chemical Spills</th></tr></thead>
          <tbody>${form.accidents
            .map(
              (a) =>
                `<tr><td>${esc(a.dates)}</td><td>${esc(a.nature)}</td><td>${esc(a.fatalities)}</td><td>${esc(a.injuries)}</td><td>${esc(a.chemicalSpills)}</td></tr>`,
            )
            .join('')}</tbody></table>`;

    const convictionsHtml = form.noConvictions
      ? '<p class="muted">No traffic convictions reported</p>'
      : `<table class="data">
          <thead><tr><th>Date</th><th>Violation</th><th>State</th><th>Penalty</th></tr></thead>
          <tbody>${form.convictions
            .map(
              (c) =>
                `<tr><td>${esc(c.dateConvicted)}</td><td>${esc(c.violation)}</td><td>${esc(c.state)}</td><td>${esc(c.penalty)}</td></tr>`,
            )
            .join('')}</tbody></table>`;

    const employmentHtml = form.employments
      .map(
        (e, i) => `
        <div class="block page-break">
          <div class="block-title">Employment ${i + 1}</div>
          <table class="kv">${rows([
            ['Employer', e.employerName],
            ['Address', e.address],
            ['Position', e.positionHeld],
            ['From', e.dateFrom],
            ['To', e.dateTo],
            ['Reason for leaving', e.reasonForLeaving],
            ['Gaps explained', e.employmentGaps || '—'],
            ['Subject to FMCSR', yn(e.subjectToFmcsr)],
            ['Safety-sensitive (DOT testing)', yn(e.safetySensitiveFunction)],
            ['Previous employer email', e.previousEmployerEmail || '—'],
            ['Previous employer phone', e.previousEmployerPhone || '—'],
          ])}</table>
        </div>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body { font-family: Helvetica, Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 16px; margin: 0 0 4px; color: #0f172a; }
  .meta { font-size: 9px; color: #475569; }
  .section { margin-bottom: 18px; }
  .section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #0284c7; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 0 0 8px; }
  .block { margin-bottom: 10px; }
  .block-title { font-weight: bold; margin-bottom: 4px; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { border-bottom: 1px solid #e2e8f0; padding: 4px 6px; vertical-align: top; }
  table.kv td.label { width: 34%; color: #475569; font-weight: 600; }
  table.data { width: 100%; border-collapse: collapse; font-size: 9px; }
  table.data th, table.data td { border: 1px solid #cbd5e1; padding: 4px; text-align: left; }
  table.data th { background: #f1f5f9; }
  .legal { font-size: 8.5px; line-height: 1.35; color: #334155; }
  .signature { margin-top: 16px; border-top: 1px solid #94a3b8; padding-top: 10px; }
  .muted { color: #64748b; font-style: italic; }
  .page-break { break-inside: avoid-page; page-break-inside: avoid; }
</style></head><body>
  <div class="header">
    <div>
      <div class="meta">USDOT # ${esc(company.dotNumber)} · ${esc(company.name)}</div>
      <h1>Drivers Application for DOT Certification</h1>
      <div class="meta">Submitted ${esc(submittedAt)}</div>
    </div>
    <div>${logo}</div>
  </div>

  <div class="section">
    <h2>Name</h2>
    <table class="kv">${rows([
      ['First', form.firstName],
      ['Middle', form.middleName || '—'],
      ['Maiden name', form.maidenName || '—'],
      ['Last', form.lastName],
    ])}</table>
  </div>

  <div class="section">
    <h2>Previous Three Years Residency</h2>
    ${residencyHtml}
  </div>

  <div class="section">
    <h2>Applicant Information</h2>
    <table class="kv">${rows([
      ['Date of birth', form.dateOfBirth],
      ['Social Security Number', form.socialSecurityNumber],
      ['Telephone', form.telephone],
      ['Email', form.email],
    ])}</table>
  </div>

  <div class="section">
    <h2>Emergency Contact</h2>
    <table class="kv">${rows([
      ['Name', form.emergencyContactName],
      ['Phone', form.emergencyContactPhone],
      ['Email', form.emergencyContactEmail || '—'],
      ['Relation', form.emergencyContactRelation],
    ])}</table>
  </div>

  <div class="section page-break">
    <h2>Required Questions</h2>
    <table class="kv">${rows([
      ['A. Denied license/permit/privilege?', yn(form.requiredQuestions.deniedLicense)],
      ['B. Suspended or revoked?', yn(form.requiredQuestions.suspendedRevoked)],
      ['C. CMV criminal conviction?', yn(form.requiredQuestions.cmvCriminalConviction)],
      ['D. Felony conviction?', yn(form.requiredQuestions.felonyConviction)],
      ['E. Refused DOT drug/alcohol test?', yn(form.requiredQuestions.refusedDrugAlcoholTest)],
      ['F. Tested positive DOT drug/alcohol?', yn(form.requiredQuestions.positiveDrugAlcoholTest)],
      ['G. Positive pre-employment test (job not obtained)?', yn(form.requiredQuestions.positivePreEmploymentTest)],
      ['Explanation (if any YES)', form.requiredQuestions.explanation || '—'],
    ])}</table>
  </div>

  <div class="section page-break">
    <h2>Certification of Compliance with Driver License Requirements</h2>
    <p class="legal">I certify that I have read and understand FMCSR Parts 383 and 391 driver license requirements. The following license is the only one I will possess.</p>
    <table class="kv">${rows([
      ['State', form.licenseState],
      ['License number', form.licenseNumber],
      ['Type', form.licenseType],
      ['Expiration', form.licenseExpiration],
    ])}</table>
  </div>

  <div class="section">
    <h2>Driving Experience</h2>
    ${experienceHtml}
  </div>

  <div class="section">
    <h2>Accident Record (Past 3 Years)</h2>
    ${accidentsHtml}
  </div>

  <div class="section">
    <h2>Traffic Convictions & Forfeitures (Past 3 Years)</h2>
    ${convictionsHtml}
  </div>

  <div class="section">
    <h2>Employment Record</h2>
    ${form.employmentGapsExplanation ? `<p><strong>Employment gaps:</strong> ${esc(form.employmentGapsExplanation)}</p>` : ''}
    ${employmentHtml}
  </div>

  <div class="section page-break">
    <h2>Authorization</h2>
    <p class="legal">I authorize ${esc(company.name)} and its agents to obtain Motor Vehicle Records, PSP reports, and employment history as required by 49 CFR 391.23 and §40.25(g).</p>
  </div>

  <div class="section">
    <h2>Applicant Certification</h2>
    <p class="legal">I certify that I have completed this application truthfully and to the best of my knowledge. I authorize investigations into my personal, employment, financial, and medical history as needed for employment decisions.</p>
    <div class="signature">
      <table class="kv">${rows([
        ['Applicant name', `${form.firstName} ${form.lastName}`],
        ['Signature (typed)', form.applicantSignature],
        ['Date', form.signatureDate],
      ])}</table>
    </div>
  </div>
</body></html>`;

    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(PDF_PAGE_TIMEOUT_MS);
      await page.emulateMediaType('print');
      await page.setContent(html, { waitUntil: 'load', timeout: PDF_PAGE_TIMEOUT_MS });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' },
      });
      await page.close();
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

export const driverIntakePdfService = new DriverIntakePdfService();
