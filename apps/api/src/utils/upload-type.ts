import { AppError } from '../middleware/errorHandler.middleware';

export type AllowedUploadKind = 'pdf' | 'jpeg' | 'png' | 'webp';

const KIND_EXT: Record<AllowedUploadKind, string> = {
  pdf: '.pdf',
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
};

const KIND_MIME: Record<AllowedUploadKind, string> = {
  pdf: 'application/pdf',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Detect type from magic bytes. Client Content-Type and filename are ignored. */
export function detectUploadKind(buffer: Buffer): AllowedUploadKind | null {
  if (buffer.length < 12) return null;
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') return 'pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

export function assertSafeUpload(buffer: Buffer, imagesOnly = false): {
  kind: AllowedUploadKind;
  ext: string;
  mime: string;
} {
  const kind = detectUploadKind(buffer);
  if (!kind) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF, JPEG, PNG, or WEBP files are allowed');
  }
  if (imagesOnly && kind === 'pdf') {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, or WEBP images are allowed');
  }
  return { kind, ext: KIND_EXT[kind], mime: KIND_MIME[kind] };
}
