import ExcelJS from 'exceljs';

/** Parsing helpers kept free of database/env imports so they can run standalone. */

export const PASSWORDS_SHEET_NAME = 'Şifreler';
export const PASSWORDS_HEADER_ROWS = 2;

export interface PasswordImportRow {
  title: string;
  url: string | null;
  username: string | null;
  password: string;
  notes: string | null;
}

export function cellText(value: ExcelJS.CellValue | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim();
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue);
  }
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('').trim();
  }
  return String(value).trim();
}

export async function readRowsFromWorkbook(filePath: string): Promise<PasswordImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet =
    workbook.getWorksheet(PASSWORDS_SHEET_NAME) ??
    workbook.worksheets.find((ws) => ws.name.toLowerCase().includes('şifre')) ??
    workbook.worksheets[0];

  if (!sheet) {
    throw new Error('No worksheet found in workbook.');
  }

  const rows: PasswordImportRow[] = [];

  for (let rowNumber = PASSWORDS_HEADER_ROWS + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const title = cellText(row.getCell(1).value);
    const url = cellText(row.getCell(2).value) || null;
    const username = cellText(row.getCell(3).value) || null;
    const password = cellText(row.getCell(4).value);
    const notes = cellText(row.getCell(5).value) || null;

    if (!title && !username && !password) continue;

    if (!title) {
      console.error(`Row ${rowNumber}: missing title — skipped.`);
      continue;
    }

    if (!password) {
      console.error(`Row ${rowNumber} (${title}): missing password — skipped.`);
      continue;
    }

    rows.push({ title, url, username, password, notes });
  }

  return rows;
}

export function parseRowsJson(raw: string): PasswordImportRow[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('No JSON received.');
  }

  const parsed = JSON.parse(trimmed);
  const list = Array.isArray(parsed) ? parsed : parsed.entries;

  if (!Array.isArray(list)) {
    throw new Error('Expected a JSON array of password entries.');
  }

  return list.map((item, index) => {
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const password = typeof item.password === 'string' ? item.password : '';

    if (!title || !password) {
      throw new Error(`Entry ${index + 1} is missing title or password.`);
    }

    return {
      title,
      url: item.url ? String(item.url).trim() : null,
      username: item.username ? String(item.username).trim() : null,
      password,
      notes: item.notes ? String(item.notes).trim() : null,
    };
  });
}
