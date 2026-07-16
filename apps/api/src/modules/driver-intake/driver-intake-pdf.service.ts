import type { DriverIntakeFormInput } from './driver-intake.schema';
import { launchPdfBrowser, PDF_PAGE_TIMEOUT_MS } from '../../utils/puppeteer';

type CompanyInfo = {
  name: string;
  dotNumber: string;
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

function dash(value: string | undefined | null): string {
  const v = value?.trim();
  return v ? esc(v) : '—';
}

function fmtDate(value: string | undefined | null): string {
  if (!value?.trim()) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function field(label: string, value: string): string {
  return `<div class="field"><span class="lbl">${esc(label)}</span><span class="val">${value}</span></div>`;
}

function section(title: string, body: string): string {
  return `<section class="sec"><h2>${esc(title)}</h2>${body}</section>`;
}

export class DriverIntakePdfService {
  async generatePdfBuffer(company: CompanyInfo, form: DriverIntakeFormInput): Promise<Buffer> {
    const submittedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ');

    const residencyRows = form.residency
      .map(
        (r, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td>${dash(r.street)}</td>
            <td>${dash(r.city)}</td>
            <td>${dash(r.state)}</td>
            <td>${dash(r.zip)}</td>
            <td>${dash(r.years)} yr</td>
          </tr>`,
      )
      .join('');

    const experienceRows = form.drivingExperience
      .filter((e) => e.equipmentClass || e.equipmentType || e.dateFrom)
      .map(
        (e) =>
          `<tr>
            <td>${dash(e.equipmentClass)}</td>
            <td>${dash(e.equipmentType)}</td>
            <td>${fmtDate(e.dateFrom)}</td>
            <td>${fmtDate(e.dateTo)}</td>
            <td>${dash(e.approxMiles)}</td>
          </tr>`,
      )
      .join('');

    const accidentRows = form.noAccidents
      ? ''
      : form.accidents
          .map(
            (a) =>
              `<tr>
                <td>${dash(a.dates)}</td>
                <td>${dash(a.nature)}</td>
                <td>${dash(a.fatalities)}</td>
                <td>${dash(a.injuries)}</td>
                <td>${dash(a.chemicalSpills)}</td>
              </tr>`,
          )
          .join('');

    const convictionRows = form.noConvictions
      ? ''
      : form.convictions
          .map(
            (c) =>
              `<tr>
                <td>${fmtDate(c.dateConvicted)}</td>
                <td>${dash(c.violation)}</td>
                <td>${dash(c.state)}</td>
                <td>${dash(c.penalty)}</td>
              </tr>`,
          )
          .join('');

    const employmentRows = form.employments
      .map(
        (e) =>
          `<tr>
            <td>${dash(e.employerName)}</td>
            <td>${dash(e.positionHeld)}</td>
            <td>${fmtDate(e.dateFrom)} – ${fmtDate(e.dateTo)}</td>
            <td>${dash(e.reasonForLeaving)}</td>
            <td>${yn(e.subjectToFmcsr)} / ${yn(e.safetySensitiveFunction)}</td>
          </tr>`,
      )
      .join('');

    const rq = form.requiredQuestions;
    const questionsGrid = [
      ['A', 'Denied license?', yn(rq.deniedLicense)],
      ['B', 'Suspended/revoked?', yn(rq.suspendedRevoked)],
      ['C', 'CMV conviction?', yn(rq.cmvCriminalConviction)],
      ['D', 'Felony?', yn(rq.felonyConviction)],
      ['E', 'Refused drug test?', yn(rq.refusedDrugAlcoholTest)],
      ['F', 'Positive drug test?', yn(rq.positiveDrugAlcoholTest)],
      ['G', 'Positive pre-employment?', yn(rq.positivePreEmploymentTest)],
    ]
      .map(
        ([id, label, answer]) =>
          `<div class="q"><span class="qid">${id}</span><span class="qtxt">${label}</span><span class="qans ${answer === 'Yes' ? 'yes' : 'no'}">${answer}</span></div>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 7.5pt;
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
    font-size: 7pt;
    color: #64748b;
  }
  .sec { margin-bottom: 7px; }
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
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2px 8px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px 8px; }
  .field { display: flex; gap: 4px; min-width: 0; padding: 1px 0; }
  .lbl { color: #64748b; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .lbl::after { content: ':'; }
  .val { color: #0f172a; font-weight: 500; word-break: break-word; }
  table.compact {
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
  }
  table.compact th {
    background: #e2e8f0;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 2px 4px;
    border: 1px solid #cbd5e1;
  }
  table.compact td {
    padding: 2px 4px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .questions { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; }
  .q { display: flex; align-items: center; gap: 4px; padding: 1px 0; }
  .qid { font-weight: 700; color: #475569; width: 12px; }
  .qtxt { flex: 1; color: #475569; font-size: 6.8pt; }
  .qans { font-weight: 700; font-size: 7pt; padding: 0 4px; border-radius: 2px; }
  .qans.no { color: #166534; }
  .qans.yes { color: #b45309; }
  .note { font-size: 6.8pt; color: #64748b; font-style: italic; margin: 2px 0; }
  .explain {
    margin-top: 3px;
    padding: 3px 5px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    font-size: 7pt;
  }
  .footer {
    margin-top: 6px;
    padding-top: 5px;
    border-top: 1px solid #cbd5e1;
    display: grid;
    grid-template-columns: 2fr 2fr 1fr;
    gap: 8px;
    align-items: end;
  }
  .sig-line {
    border-bottom: 1px solid #334155;
    padding-bottom: 2px;
    font-weight: 600;
    font-size: 8pt;
    min-height: 14px;
  }
  .sig-lbl { font-size: 6.5pt; color: #64748b; margin-top: 1px; }
</style></head><body>
  <div class="title-bar">
    <h1>Driver Application — DOT Certification</h1>
    <div class="sub">${esc(company.name)} · USDOT #${esc(company.dotNumber)} · Submitted ${esc(submittedAt)}</div>
  </div>

  ${section(
    'Applicant',
    `<div class="grid-4">
      ${field('Name', dash(fullName))}
      ${field('DOB', fmtDate(form.dateOfBirth))}
      ${field('SSN', dash(form.socialSecurityNumber))}
      ${field('Phone', dash(form.telephone))}
      ${field('Email', dash(form.email))}
      ${field('Maiden', dash(form.maidenName))}
    </div>`,
  )}

  ${section(
    'Emergency Contact',
    `<div class="grid-4">
      ${field('Name', dash(form.emergencyContactName))}
      ${field('Phone', dash(form.emergencyContactPhone))}
      ${field('Email', dash(form.emergencyContactEmail))}
      ${field('Relation', dash(form.emergencyContactRelation))}
    </div>`,
  )}

  ${section(
    'Residency (3 Years)',
    `<table class="compact">
      <thead><tr><th>#</th><th>Street</th><th>City</th><th>St</th><th>Zip</th><th>Duration</th></tr></thead>
      <tbody>${residencyRows}</tbody>
    </table>`,
  )}

  ${section(
    'Driver License',
    `<div class="grid-4">
      ${field('State', dash(form.licenseState))}
      ${field('Number', dash(form.licenseNumber))}
      ${field('Type', dash(form.licenseType))}
      ${field('Expires', fmtDate(form.licenseExpiration))}
    </div>`,
  )}

  ${section(
    'Required Questions',
    `<div class="questions">${questionsGrid}</div>
    ${
      rq.explanation?.trim()
        ? `<div class="explain"><strong>Explanation:</strong> ${esc(rq.explanation)}</div>`
        : ''
    }`,
  )}

  ${section(
    'Driving Experience',
    experienceRows
      ? `<table class="compact">
          <thead><tr><th>Class</th><th>Equipment</th><th>From</th><th>To</th><th>Miles</th></tr></thead>
          <tbody>${experienceRows}</tbody>
        </table>`
      : '<p class="note">None reported</p>',
  )}

  ${section(
    'Accidents & Convictions (3 Years)',
    `<div class="grid-2">
      <div>
        <strong style="font-size:7pt;color:#475569">Accidents</strong>
        ${
          form.noAccidents
            ? '<p class="note">None</p>'
            : `<table class="compact"><thead><tr><th>Date</th><th>Nature</th><th>Fatal</th><th>Inj</th><th>Spill</th></tr></thead><tbody>${accidentRows}</tbody></table>`
        }
      </div>
      <div>
        <strong style="font-size:7pt;color:#475569">Convictions</strong>
        ${
          form.noConvictions
            ? '<p class="note">None</p>'
            : `<table class="compact"><thead><tr><th>Date</th><th>Violation</th><th>St</th><th>Penalty</th></tr></thead><tbody>${convictionRows}</tbody></table>`
        }
      </div>
    </div>`,
  )}

  ${section(
    'Employment History',
    `${form.employmentGapsExplanation?.trim() ? `<p class="note">Gaps: ${esc(form.employmentGapsExplanation)}</p>` : ''}
    <table class="compact">
      <thead><tr><th>Employer</th><th>Position</th><th>Period</th><th>Reason Left</th><th>FMCSR / DOT</th></tr></thead>
      <tbody>${employmentRows}</tbody>
    </table>`,
  )}

  <div class="footer">
    <div>
      <div class="sig-line">${esc(form.applicantSignature)}</div>
      <div class="sig-lbl">Applicant signature (typed)</div>
    </div>
    <div>
      <div class="sig-line">${esc(fullName)}</div>
      <div class="sig-lbl">Printed name</div>
    </div>
    <div>
      <div class="sig-line">${fmtDate(form.signatureDate)}</div>
      <div class="sig-lbl">Date</div>
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
        margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
        preferCSSPageSize: true,
      });
      await page.close();
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}

export const driverIntakePdfService = new DriverIntakePdfService();
