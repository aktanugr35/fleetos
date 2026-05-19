import fs from 'fs';
import path from 'path';
import { LOGOS_DIR, resolveUploadUrl } from '../config/paths';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export function resolveLogoFilePath(logoUrl: string): string {
  return resolveUploadUrl(logoUrl);
}

export function deleteCompanyLogoFiles(companyId: string) {
  if (!fs.existsSync(LOGOS_DIR)) return;

  const prefix = `company-${companyId}`;
  for (const file of fs.readdirSync(LOGOS_DIR)) {
    if (file.startsWith(prefix)) {
      fs.unlinkSync(path.join(LOGOS_DIR, file));
    }
  }
}

export function buildCompanyLogoHtml(logoUrl: string | null, companyName: string): string {
  if (!logoUrl) {
    return buildLogoPlaceholder(companyName);
  }

  const filepath = resolveLogoFilePath(logoUrl);
  if (!fs.existsSync(filepath)) {
    return buildLogoPlaceholder(companyName);
  }

  const ext = path.extname(filepath).toLowerCase();
  const mime = MIME_BY_EXT[ext] || 'image/png';
  const base64 = fs.readFileSync(filepath).toString('base64');

  return `<img src="data:${mime};base64,${base64}" alt="${escapeHtml(companyName)}" class="company-logo" />`;
}

function buildLogoPlaceholder(companyName: string): string {
  const first = companyName.split(' ')[0] || 'TMS';
  const rest = companyName.substring(companyName.indexOf(' ') + 1) || 'INC';
  return `<div class="logo-placeholder">${escapeHtml(first)}<span>${escapeHtml(rest)}</span></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
