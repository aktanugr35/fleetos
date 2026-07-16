import fs from 'fs';
import path from 'path';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env, isProdLikeEnv } from '../config/env';
import { DOCUMENTS_DIR, resolveUploadUrl } from '../config/paths';
import { AppError } from '../middleware/errorHandler.middleware';

const S3_PREFIX = 's3:';

export function isS3StorageEnabled(): boolean {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
}

/** Validates storage config at startup (staging/production require S3 for documents). */
export function assertStorageConfig(): void {
  if (isProdLikeEnv() && !isS3StorageEnabled()) {
    throw new Error(
      'Document storage: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in staging/production',
    );
  }
}

function assertLocalDocumentUploadAllowed(): void {
  if (isProdLikeEnv() && !isS3StorageEnabled()) {
    throw new AppError(
      500,
      'LOCAL_STORAGE_DISABLED',
      'Document uploads require S3 in staging/production',
    );
  }
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!isS3StorageEnabled()) {
    throw new AppError(500, 'S3_NOT_CONFIGURED', 'S3 credentials are not configured');
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: Boolean(env.S3_ENDPOINT),
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export function buildDocumentStorageKey(tenantId: string, filename: string): string {
  return `documents/${tenantId}/${filename}`;
}

export function toStoredFileUrl(storageKey: string): string {
  if (isS3StorageEnabled()) {
    return `${S3_PREFIX}${storageKey}`;
  }
  return `/uploads/${storageKey}`;
}

export function parseStoredFileUrl(fileUrl: string): { kind: 'local' | 's3'; key: string } {
  if (fileUrl.startsWith(S3_PREFIX)) {
    return { kind: 's3', key: fileUrl.slice(S3_PREFIX.length) };
  }
  const relative = fileUrl.replace(/^\//, '');
  return { kind: 'local', key: relative };
}

export async function saveDocumentFile(
  tenantId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const storageKey = buildDocumentStorageKey(tenantId, filename);

  if (isS3StorageEnabled()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    return toStoredFileUrl(storageKey);
  }

  assertLocalDocumentUploadAllowed();

  const destDir = path.join(DOCUMENTS_DIR, tenantId);
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, filename);
  fs.writeFileSync(destPath, buffer);
  return toStoredFileUrl(storageKey);
}

export async function deleteStoredFile(fileUrl: string): Promise<void> {
  const parsed = parseStoredFileUrl(fileUrl);

  if (parsed.kind === 's3') {
    if (!isS3StorageEnabled()) return;
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: parsed.key,
      })
    );
    return;
  }

  const filePath = resolveUploadUrl(`/${parsed.key}`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function getDocumentSignedDownloadUrl(fileUrl: string): Promise<string | null> {
  const parsed = parseStoredFileUrl(fileUrl);
  if (parsed.kind !== 's3' || !isS3StorageEnabled()) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: parsed.key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
}

export async function openDocumentReadStream(fileUrl: string): Promise<{
  stream: NodeJS.ReadableStream;
  contentType: string;
}> {
  const parsed = parseStoredFileUrl(fileUrl);

  if (parsed.kind === 's3') {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: parsed.key,
      }),
    );

    if (!response.Body) {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Document file is missing in storage');
    }

    return {
      stream: response.Body as NodeJS.ReadableStream,
      contentType: response.ContentType || 'application/octet-stream',
    };
  }

  const filePath = resolveUploadUrl(`/${parsed.key}`);
  if (!fs.existsSync(filePath)) {
    throw new AppError(404, 'FILE_NOT_FOUND', 'Document file is missing on disk');
  }

  return {
    stream: fs.createReadStream(filePath),
    contentType: mimeTypeFromPath(filePath),
  };
}

function mimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export function getLocalDocumentPath(fileUrl: string): string {
  const parsed = parseStoredFileUrl(fileUrl);
  if (parsed.kind === 's3') {
    throw new AppError(400, 'NOT_LOCAL_FILE', 'Document is stored in S3');
  }
  return resolveUploadUrl(`/${parsed.key}`);
}
