import ExcelJS from 'exceljs';
import { prisma } from '../config/database';
import { passwordsService } from '../modules/passwords/passwords.service';

const SHEET_NAME = 'Şifreler';
const HEADER_ROWS = 2;
const EXPECTED_ROWS = 22;

function cellText(value: ExcelJS.CellValue | null | undefined): string {
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

function parseArgs() {
  const args = process.argv.slice(2);
  let filePath = '';
  let companySlug = process.env.COMPANY_SLUG || '';
  let replace = false;

  for (const arg of args) {
    if (arg === '--replace') {
      replace = true;
      continue;
    }
    if (arg.startsWith('--company-slug=')) {
      companySlug = arg.slice('--company-slug='.length);
      continue;
    }
    if (!filePath) {
      filePath = arg;
    }
  }

  return { filePath, companySlug, replace };
}

async function resolveCompany(slug: string) {
  if (slug) {
    return prisma.company.findFirst({ where: { slug } });
  }

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'asc' },
  });

  if (companies.length === 1) {
    return companies[0];
  }

  console.error('Multiple companies found — pass --company-slug=<slug>:');
  for (const company of companies) {
    console.error(`  - ${company.slug} (${company.name})`);
  }
  return null;
}

async function main() {
  const { filePath, companySlug, replace } = parseArgs();

  if (!filePath) {
    console.error(
      'Usage: node apps/api/dist/cli/import-passwords.js <path-to-xlsx> [--company-slug=slug] [--replace]',
    );
    process.exit(1);
  }

  const company = await resolveCompany(companySlug);
  if (!company) {
    if (companySlug) {
      const companies = await prisma.company.findMany({ select: { slug: true, name: true } });
      console.error(`Company not found for slug: ${companySlug}`);
      if (companies.length) {
        console.error('Available companies:');
        for (const entry of companies) {
          console.error(`  - ${entry.slug} (${entry.name})`);
        }
      }
    }
    process.exit(1);
  }

  if (replace) {
    const deleted = await prisma.companyPassword.deleteMany({ where: { companyId: company.id } });
    console.log(`Removed ${deleted.count} existing password entries for ${company.name}.`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet =
    workbook.getWorksheet(SHEET_NAME) ??
    workbook.worksheets.find((ws) => ws.name.toLowerCase().includes('şifre')) ??
    workbook.worksheets[0];

  if (!sheet) {
    console.error('No worksheet found in workbook.');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const titles: string[] = [];

  for (let rowNumber = HEADER_ROWS + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const title = cellText(row.getCell(1).value);
    const url = cellText(row.getCell(2).value) || null;
    const username = cellText(row.getCell(3).value) || null;
    const password = cellText(row.getCell(4).value);
    const notes = cellText(row.getCell(5).value) || null;

    if (!title && !username && !password) {
      skipped += 1;
      continue;
    }

    if (!title) {
      console.error(`Row ${rowNumber}: missing title — skipped.`);
      skipped += 1;
      continue;
    }

    if (!password) {
      console.error(`Row ${rowNumber} (${title}): missing password — skipped.`);
      skipped += 1;
      continue;
    }

    const result = await passwordsService.upsertImportedRow(company.id, {
      title,
      url,
      username,
      password,
      notes,
      sortOrder: rowNumber - HEADER_ROWS,
    });

    titles.push(title);
    if (result === 'created') created += 1;
    else updated += 1;
  }

  const imported = created + updated;

  console.log(`Company: ${company.name} (${company.slug})`);
  console.log(`Sheet: ${sheet.name}`);
  console.log(`Imported: ${imported} (created ${created}, updated ${updated}, skipped ${skipped})`);

  if (imported !== EXPECTED_ROWS) {
    console.warn(`Expected ${EXPECTED_ROWS} entries — verify the Excel file before relying on import.`);
  } else {
    console.log(`Verified: ${EXPECTED_ROWS} entries imported.`);
  }

  console.log('Titles:');
  for (const title of titles) {
    console.log(`  - ${title}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
