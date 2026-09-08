/**
 * Shrinks phone photos before upload. A modern phone camera produces 3–8 MB images;
 * five of those in one request is what triggers nginx 413 (payload too large).
 *
 * We always re-encode to JPEG under a hard size cap. If the browser cannot decode
 * the file (common with iPhone HEIC on some Android browsers), we reject it instead
 * of silently sending the original — that is how the 413 used to happen.
 */

const TARGET_BYTES = 450_000;
/** Nginx's default is 1 MB; stay well under that even for a single-file request. */
export const MAX_UPLOAD_BYTES = 800_000;
const EDGES = [1600, 1280, 1024, 800];
const QUALITIES = [0.82, 0.7, 0.55, 0.4];

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

async function decode(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    // `from-image` applies the EXIF rotation that re-encoding would otherwise discard.
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpegName(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}

async function encode(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name)) {
    throw new ImageCompressionError('Please choose a photo (JPG or PNG).');
  }

  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = await decode(file);
  } catch {
    throw new ImageCompressionError(
      'This photo could not be prepared. Please take a new picture with the camera instead of attaching a file from the gallery.',
    );
  }

  let best: Blob | null = null;
  for (const edge of EDGES) {
    const scale = Math.min(1, edge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    for (const quality of QUALITIES) {
      const blob = await encode(source, width, height, quality);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= TARGET_BYTES) {
        if ('close' in source && typeof source.close === 'function') source.close();
        return new File([blob], toJpegName(file.name), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    }
  }

  if ('close' in source && typeof source.close === 'function') source.close();

  if (!best || best.size > MAX_UPLOAD_BYTES) {
    throw new ImageCompressionError(
      'This photo is still too large after shrinking. Please retake it from a bit further away or lower the camera resolution.',
    );
  }

  return new File([best], toJpegName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}
