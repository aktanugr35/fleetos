import ExcelJS from 'exceljs';
import { calendarDayInZone } from '../../utils/datePeriod';

export interface DriverLoadExportRow {
  loadNumber: string;
  pickupDate: Date;
  pickupLocation: string;
  deliveryLocation: string;
  stops?: { sequence: number; location: string }[];
  brokerName: string;
  driverName: string;
  bookedByName: string | null;
  totalCents: number;
}

export interface DriverLoadExportMeta {
  driverName: string;
  periodStart: Date;
  periodEnd: Date;
}

const HEADERS = ['Load ID', 'PU Date', 'Destination', 'Broker', 'Driver', 'Booked By', 'Total'] as const;

const TOTAL_COLUMN = HEADERS.length;

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF000000' } },
};

/** Excel renders serial dates in UTC, so anchor the Eastern calendar day at UTC midnight. */
function excelDate(value: Date): Date {
  return new Date(`${calendarDayInZone(value)}T00:00:00Z`);
}

export function formatLoadRoute(row: DriverLoadExportRow): string {
  const legs = [
    row.pickupLocation,
    ...(row.stops ?? []).slice().sort((a, b) => a.sequence - b.sequence).map((stop) => stop.location),
    row.deliveryLocation,
  ];
  return legs.filter(Boolean).join(' → ');
}

export function buildDriverLoadsWorkbook(
  rows: DriverLoadExportRow[],
  meta: DriverLoadExportMeta,
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Loads');
  sheet.columns = [
    { key: 'loadNumber', width: 18 },
    { key: 'pickupDate', width: 12 },
    { key: 'destination', width: 46 },
    { key: 'broker', width: 20 },
    { key: 'driver', width: 16 },
    { key: 'bookedBy', width: 18 },
    { key: 'total', width: 14 },
  ];

  const headerRow = sheet.addRow([...HEADERS]);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  });

  for (const row of rows) {
    const added = sheet.addRow([
      row.loadNumber,
      excelDate(row.pickupDate),
      formatLoadRoute(row),
      row.brokerName,
      row.driverName,
      row.bookedByName || '—',
      row.totalCents / 100,
    ]);
    added.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
    added.getCell(2).numFmt = 'd-mmm-yy';
    added.getCell(2).alignment = { horizontal: 'center' };
    added.getCell(TOTAL_COLUMN).numFmt = '$#,##0.00';
  }

  const totalCents = rows.reduce((sum, row) => sum + row.totalCents, 0);
  const totalRow = sheet.addRow([
    'Total',
    '',
    '',
    '',
    '',
    `${rows.length} load${rows.length === 1 ? '' : 's'}`,
    totalCents / 100,
  ]);
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
  });
  totalRow.getCell(TOTAL_COLUMN).numFmt = '$#,##0.00';

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };

  return workbook;
}

/** Period bounds are plain calendar days built from server-local parts, not instants. */
function periodDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function driverLoadsFileName(meta: DriverLoadExportMeta): string {
  const safeName = meta.driverName.trim().replace(/[^\w.-]+/g, '_') || 'driver';
  return `loads_${safeName}_${periodDay(meta.periodStart)}_${periodDay(meta.periodEnd)}.xlsx`;
}
