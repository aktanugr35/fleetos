/**
 * Converts the passwords workbook to JSON on stdout so it can be piped straight
 * into the production importer without copying the spreadsheet to the server:
 *
 *   pnpm --filter @haulyard/api exec tsx src/cli/xlsx-to-json.ts <file.xlsx> \
 *     | ssh root@HOST 'docker exec -i haulyard-prod-api node apps/api/dist/cli/import-passwords.js --stdin'
 */
import { readRowsFromWorkbook } from './passwords-xlsx';

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: tsx src/cli/xlsx-to-json.ts <path-to-xlsx>');
    process.exit(1);
  }

  const rows = await readRowsFromWorkbook(filePath);
  console.error(`Parsed ${rows.length} entries from ${filePath}`);
  process.stdout.write(JSON.stringify(rows));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
