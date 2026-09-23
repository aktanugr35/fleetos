import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler.middleware';

/** apps/api root — works from `src/` (tsx) and `dist/` (node) */
const CONFIG_DIR = __dirname;
export const API_ROOT = path.resolve(CONFIG_DIR, '../..');
export const UPLOADS_DIR = path.join(API_ROOT, 'uploads');
export const LOGOS_DIR = path.join(UPLOADS_DIR, 'logos');
export const DOCUMENTS_DIR = path.join(UPLOADS_DIR, 'documents');
export const SETTLEMENTS_DIR = path.join(UPLOADS_DIR, 'settlements');

/** Ensure upload directories exist (local storage). */
export function ensureUploadDirs(): void {
  for (const dir of [UPLOADS_DIR, LOGOS_DIR, DOCUMENTS_DIR, SETTLEMENTS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/** Resolve `/uploads/...` URL to an absolute filesystem path under uploads/. */
export function resolveUploadUrl(uploadUrl: string): string {
  if (!uploadUrl || uploadUrl.includes('\0')) {
    throw new AppError(400, 'INVALID_PATH', 'Invalid file path');
  }
  const relative = uploadUrl.replace(/^\//, '');
  const resolved = path.resolve(API_ROOT, relative);
  const root = path.resolve(UPLOADS_DIR);
  const rel = path.relative(root, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new AppError(400, 'INVALID_PATH', 'Invalid file path');
  }
  return resolved;
}
