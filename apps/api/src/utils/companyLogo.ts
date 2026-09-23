import fs from 'fs';
import path from 'path';
import type { Response } from 'express';
import { LOGOS_DIR, resolveUploadUrl } from '../config/paths';
import { AppError } from '../middleware/errorHandler.middleware';
import { escapeHtml } from './html';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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
  return `<div class="logo-placeholder">${escapeHtml(companyName || 'Insert Logo')}</div>`;
}

export function sendLogoFile(res: Response, logoUrl: string): void {
  const filepath = resolveLogoFilePath(logoUrl);
  if (!fs.existsSync(filepath)) {
    throw new AppError(404, 'LOGO_NOT_FOUND', 'Logo file is missing');
  }
  const ext = path.extname(filepath).toLowerCase();
  res.setHeader('Content-Type', MIME_BY_EXT[ext] || 'image/png');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(filepath));
}
