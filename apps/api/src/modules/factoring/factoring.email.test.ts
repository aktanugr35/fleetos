import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildBillingSubmissionEmail } from './factoring.email';

const load = {
  loadNumber: 'VT-2026-00042',
  puNumber: '889123',
  brokerName: 'MegaCorp <Logistics>',
  pickupLocation: 'Dallas, TX',
  deliveryLocation: 'Atlanta, GA',
  pickupDate: new Date('2026-10-20T14:00:00Z'),
  deliveryDate: new Date('2026-10-21T18:00:00Z'),
  driverName: 'Cuneyt Kaya',
  amountCents: 245050,
};

describe('buildBillingSubmissionEmail', () => {
  it('leads with the PU number and lists the load details', () => {
    const email = buildBillingSubmissionEmail('Haulyard LLC', 'FACTORING', load);
    assert.equal(email.subject, 'Invoiced: PU# 889123 — MegaCorp <Logistics>');
    assert.match(email.text, /PU# 889123 has been invoiced by Haulyard LLC \(Factoring\)/);
    assert.match(email.text, /Amount: \$2,450\.50/);
    assert.match(email.text, /Pickup: Oct 20, 2026 · Dallas, TX/);
  });

  it('escapes HTML and falls back to the load number without a PU#', () => {
    const email = buildBillingSubmissionEmail('Haulyard LLC', 'IN_HOUSE', { ...load, puNumber: null });
    assert.match(email.subject, /^Invoiced: Load VT-2026-00042/);
    assert.match(email.html, /MegaCorp &lt;Logistics&gt;/);
    assert.match(email.text, /In-house finance/);
  });
});
