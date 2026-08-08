import { prisma } from '../config/database';
import { passwordsService } from '../modules/passwords/passwords.service';
import { parseRowsJson, readRowsFromWorkbook, type PasswordImportRow } from './passwords-xlsx';

const EXPECTED_ROWS = 22;

function parseArgs() {
  const args = process.argv.slice(2);
  let filePath = '';
  let companySlug = process.env.COMPANY_SLUG || '';
  let replace = false;
  let stdin = false;

  for (const arg of args) {
    if (arg === '--replace') {
      replace = true;
      continue;
    }
    if (arg === '--stdin') {
      stdin = true;
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

  return { filePath, companySlug, replace, stdin };
}

async function readRowsFromStdin(): Promise<PasswordImportRow[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return parseRowsJson(Buffer.concat(chunks).toString('utf8'));
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
  const { filePath, companySlug, replace, stdin } = parseArgs();

  if (!filePath && !stdin) {
    console.error(
      'Usage: node apps/api/dist/cli/import-passwords.js <path-to-xlsx> [--company-slug=slug] [--replace]\n' +
        '       node apps/api/dist/cli/import-passwords.js --stdin [--company-slug=slug] [--replace]',
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

  const rows = stdin ? await readRowsFromStdin() : await readRowsFromWorkbook(filePath);

  if (rows.length === 0) {
    console.error('No usable rows found — nothing imported.');
    process.exit(1);
  }

  if (replace) {
    const deleted = await prisma.companyPassword.deleteMany({ where: { companyId: company.id } });
    console.log(`Removed ${deleted.count} existing password entries for ${company.name}.`);
  }

  let created = 0;
  let updated = 0;
  const titles: string[] = [];

  for (const [index, row] of rows.entries()) {
    const result = await passwordsService.upsertImportedRow(company.id, {
      ...row,
      sortOrder: index + 1,
    });

    titles.push(row.title);
    if (result === 'created') created += 1;
    else updated += 1;
  }

  const imported = created + updated;

  console.log(`Company: ${company.name} (${company.slug})`);
  console.log(`Source: ${stdin ? 'stdin (JSON)' : filePath}`);
  console.log(`Imported: ${imported} (created ${created}, updated ${updated})`);

  if (imported !== EXPECTED_ROWS) {
    console.warn(`Expected ${EXPECTED_ROWS} entries — verify the source before relying on import.`);
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
