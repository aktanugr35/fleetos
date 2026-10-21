import type { BillingMethod } from '@prisma/client';

export interface BillingEmailLoad {
  loadNumber: string;
  puNumber: string | null;
  brokerName: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: Date;
  deliveryDate: Date | null;
  driverName: string;
  amountCents: number;
}

export const BILLING_METHOD_LABEL: Record<BillingMethod, string> = {
  FACTORING: 'Factoring',
  IN_HOUSE: 'In-house finance',
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const formatDay = (date: Date | null) =>
  date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })
    : '—';

const formatMoney = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function buildBillingSubmissionEmail(companyName: string, method: BillingMethod, load: BillingEmailLoad) {
  const reference = load.puNumber ? `PU# ${load.puNumber}` : `Load ${load.loadNumber}`;
  const subject = `Invoiced: ${reference} — ${load.brokerName}`;

  const rows: [string, string][] = [
    ['PU #', load.puNumber || '—'],
    ['Load #', load.loadNumber],
    ['Broker', load.brokerName],
    ['Pickup', `${formatDay(load.pickupDate)} · ${load.pickupLocation}`],
    ['Delivery', `${formatDay(load.deliveryDate)} · ${load.deliveryLocation}`],
    ['Driver', load.driverName],
    ['Amount', formatMoney(load.amountCents)],
    ['Billing', BILLING_METHOD_LABEL[method]],
  ];

  const intro = `${reference} has been invoiced by ${companyName} (${BILLING_METHOD_LABEL[method]}).`;
  const text = [intro, '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
      <p>${escapeHtml(intro)}</p>
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="color:#555;border-bottom:1px solid #eee">${escapeHtml(k)}</td><td style="border-bottom:1px solid #eee"><strong>${escapeHtml(v)}</strong></td></tr>`,
          )
          .join('')}
      </table>
    </div>`;

  return { subject, text, html };
}
