import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  buildDriverLoadsWorkbook,
  driverLoadsFileName,
  formatLoadRoute,
  type DriverLoadExportRow,
} from './driver-loads.export';

function row(overrides: Partial<DriverLoadExportRow> = {}): DriverLoadExportRow {
  return {
    loadNumber: 'VT-2026-00071',
    pickupDate: new Date('2026-08-13T16:00:00.000Z'),
    pickupLocation: 'Wilmington, DE',
    deliveryLocation: 'Virginia Beach, VA',
    brokerName: 'Amazon',
    driverName: 'Anil',
    bookedByName: 'Mert Kaya',
    totalCents: 57327,
    ...overrides,
  };
}

describe('formatLoadRoute', () => {
  it('joins pickup and delivery', () => {
    assert.equal(formatLoadRoute(row()), 'Wilmington, DE → Virginia Beach, VA');
  });

  it('includes stops in sequence order', () => {
    const route = formatLoadRoute(
      row({
        stops: [
          { sequence: 2, location: 'Raleigh, NC' },
          { sequence: 1, location: 'Richmond, VA' },
        ],
      }),
    );
    assert.equal(route, 'Wilmington, DE → Richmond, VA → Raleigh, NC → Virginia Beach, VA');
  });
});

describe('buildDriverLoadsWorkbook', () => {
  const meta = {
    driverName: 'Anil Yilmaz',
    periodStart: new Date(2026, 7, 10),
    periodEnd: new Date(2026, 7, 16),
  };

  it('writes a header, one row per load, and a totals row', () => {
    const workbook = buildDriverLoadsWorkbook(
      [row(), row({ loadNumber: 'VT-2026-00072', totalCents: 161212 })],
      meta,
    );
    const sheet = workbook.getWorksheet('Loads');
    assert.ok(sheet);

    const header = sheet.getRow(1);
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6, 7].map((col) => header.getCell(col).value),
      ['Load ID', 'PU Date', 'Destination', 'Broker', 'Driver', 'Booked By', 'Total'],
    );

    assert.equal(sheet.getRow(2).getCell(1).value, 'VT-2026-00071');
    assert.equal(sheet.getRow(2).getCell(6).value, 'Mert Kaya');
    assert.equal(sheet.getRow(2).getCell(7).value, 573.27);
    assert.equal(sheet.getRow(3).getCell(7).value, 1612.12);

    const totals = sheet.getRow(4);
    assert.equal(totals.getCell(1).value, 'Total');
    assert.equal(totals.getCell(6).value, '2 loads');
    assert.equal(totals.getCell(7).value, 2185.39);
  });

  it('falls back to a dash when no dispatcher booked the load', () => {
    const workbook = buildDriverLoadsWorkbook([row({ bookedByName: null })], meta);
    assert.equal(workbook.getWorksheet('Loads')!.getRow(2).getCell(6).value, '—');
  });

  it('keeps a late evening pickup on its Eastern calendar day', () => {
    // 9 PM ET on Aug 13 is already Aug 14 in UTC.
    const workbook = buildDriverLoadsWorkbook(
      [row({ pickupDate: new Date('2026-08-14T01:00:00.000Z') })],
      meta,
    );
    const cell = workbook.getWorksheet('Loads')!.getRow(2).getCell(2).value as Date;
    assert.equal(cell.toISOString(), '2026-08-13T00:00:00.000Z');
  });

  it('handles an empty period', () => {
    const workbook = buildDriverLoadsWorkbook([], meta);
    const totals = workbook.getWorksheet('Loads')!.getRow(2);
    assert.equal(totals.getCell(6).value, '0 loads');
    assert.equal(totals.getCell(7).value, 0);
  });
});

describe('driverLoadsFileName', () => {
  it('uses the period calendar days without shifting them', () => {
    assert.equal(
      driverLoadsFileName({
        driverName: 'Anil Yilmaz',
        periodStart: new Date(2026, 7, 10),
        periodEnd: new Date(2026, 7, 16),
      }),
      'loads_Anil_Yilmaz_2026-08-10_2026-08-16.xlsx',
    );
  });
});
