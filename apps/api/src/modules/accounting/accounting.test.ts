import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildProfitAndLoss } from './accounting.pnl';
import { accountingEntrySchema, parseEntryDay } from './accounting.schema';

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('buildProfitAndLoss', () => {
  const from = new Date('2026-08-01T00:00:00.000Z');
  const to = new Date('2026-10-24T23:59:59.999Z');

  it('totals app and manual lines and nets them per month', () => {
    const pnl = buildProfitAndLoss(from, to, [
      { side: 'income', key: 'LOAD_REVENUE', date: day('2026-08-10'), amountCents: 500_000 },
      { side: 'income', key: 'LOAD_REVENUE', date: day('2026-09-03'), amountCents: 300_000 },
      { side: 'income', key: 'REFUND', date: day('2026-09-04'), amountCents: 10_000 },
      { side: 'expense', key: 'DRIVER_PAY', date: day('2026-08-15'), amountCents: 200_000 },
      { side: 'expense', key: 'FACTORING_FEES', date: day('2026-08-10'), amountCents: 7_500 },
      { side: 'expense', key: 'INSURANCE', date: day('2026-09-01'), amountCents: 120_000 },
      { side: 'expense', key: 'REPAIRS', date: day('2026-09-20'), amountCents: 30_000 },
    ]);

    assert.equal(pnl.income.totalCents, 810_000);
    assert.equal(pnl.expenses.totalCents, 357_500);
    assert.equal(pnl.netCents, 452_500);

    assert.deepEqual(
      pnl.months.map((m) => [m.monthKey, m.incomeCents, m.expenseCents, m.netCents, m.partial]),
      [
        ['2026-08', 500_000, 207_500, 292_500, false],
        ['2026-09', 310_000, 150_000, 160_000, false],
        ['2026-10', 0, 0, 0, true],
      ],
    );
  });

  it('always lists the app lines, then manual categories largest first', () => {
    const pnl = buildProfitAndLoss(from, to, [
      { side: 'expense', key: 'TIRES', date: day('2026-08-02'), amountCents: 5_000 },
      { side: 'expense', key: 'INSURANCE', date: day('2026-08-02'), amountCents: 90_000 },
    ]);
    assert.deepEqual(
      pnl.expenses.lines.map((l) => [l.key, l.source]),
      [
        ['DRIVER_PAY', 'auto'],
        ['DISPATCHER_PAY', 'auto'],
        ['FUEL', 'auto'],
        ['TOLLS', 'auto'],
        ['FACTORING_FEES', 'auto'],
        ['INSURANCE', 'manual'],
        ['TIRES', 'manual'],
      ],
    );
    assert.equal(pnl.expenses.lines.find((l) => l.key === 'INSURANCE')?.label, 'Insurance');
    assert.deepEqual(pnl.income.lines.map((l) => l.key), ['LOAD_REVENUE']);
  });
});

describe('accountingEntrySchema', () => {
  const valid = { kind: 'EXPENSE', category: 'REPAIRS', date: '2026-10-05', amount: 45_000 };

  it('stores the chosen calendar day at UTC midnight and blanks optional fields', () => {
    const parsed = accountingEntrySchema.parse({ ...valid, vendor: '  ', truckId: '', paymentMethod: '' });
    assert.equal(parsed.date.toISOString(), '2026-10-05T00:00:00.000Z');
    assert.equal(parsed.vendor, null);
    assert.equal(parsed.truckId, null);
    assert.equal(parsed.paymentMethod, null);
  });

  it('rejects a category from the other side of the books', () => {
    assert.equal(accountingEntrySchema.safeParse({ ...valid, kind: 'INCOME' }).success, false);
    assert.equal(accountingEntrySchema.safeParse({ ...valid, kind: 'INCOME', category: 'REFUND' }).success, true);
  });

  it('rejects zero amounts, unknown payment methods and impossible dates', () => {
    assert.equal(accountingEntrySchema.safeParse({ ...valid, amount: 0 }).success, false);
    assert.equal(accountingEntrySchema.safeParse({ ...valid, paymentMethod: 'BITCOIN' }).success, false);
    assert.equal(parseEntryDay('2026-02-30'), null);
  });
});
