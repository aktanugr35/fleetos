import fs from 'fs';
import puppeteer from 'puppeteer';
import { AppError } from '../middleware/errorHandler.middleware';

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

export function resolveChromeExecutable(): string {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const bundled = puppeteer.executablePath();
    if (bundled && fs.existsSync(bundled)) {
      return bundled;
    }
  } catch {
    // bundled browser not installed
  }

  throw new AppError(
    503,
    'PDF_CHROME_UNAVAILABLE',
    'Chrome is required for PDF generation. Install it with: cd apps/api && npx puppeteer browsers install chrome'
  );
}

const PDF_LAUNCH_TIMEOUT_MS = 60_000;

export async function launchPdfBrowser() {
  const executablePath = resolveChromeExecutable();
  return puppeteer.launch({
    headless: true,
    executablePath,
    timeout: PDF_LAUNCH_TIMEOUT_MS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
}

export const PDF_PAGE_TIMEOUT_MS = 30_000;
