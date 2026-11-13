import { mkdirSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import {
  copyFile,
  mkdir,
  rename,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

/**
 * Almacenamiento de media (fotos y videos de anuncios).
 *
 * Dos drivers:
 *  - `local`  → disco del servidor (UPLOADS_DIR). Sirve en /uploads.
 *  - `s3`     → cualquier object storage compatible con S3 (Cloudflare R2,
 *               AWS S3, Backblaze B2, MinIO). Pensado para escalar: las fotos
 *               sobreviven redeploys, se replican y se sirven por CDN.
 *
 * Con `s3` la base de datos guarda la URL pública absoluta; la web no cambia.
 * Los archivos locales previos siguen sirviéndose en /uploads.
 */

const DEFAULT_MEDIA_DIR = resolve(
  fileURLToPath(new URL('../../uploads/media', import.meta.url)),
);

export const MEDIA_DIR = env.uploadsDir
  ? resolve(env.uploadsDir)
  : DEFAULT_MEDIA_DIR;
mkdirSync(MEDIA_DIR, { recursive: true });

export const storageDriver = env.uploadsDriver === 's3' ? 's3' : 'local';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

if (storageDriver === 's3') {
  const missing = [
    ['S3_BUCKET', env.s3.bucket],
    ['S3_ACCESS_KEY_ID', env.s3.accessKeyId],
    ['S3_SECRET_ACCESS_KEY', env.s3.secretAccessKey],
    ['S3_PUBLIC_URL', env.s3.publicUrl],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `[storage] UPLOADS_DRIVER=s3 requiere: ${missing.join(', ')}`,
    );
  }
}

let s3ClientPromise;

async function getS3Client() {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      return new S3Client({
        region: env.s3.region,
        ...(env.s3.endpoint ? { endpoint: env.s3.endpoint } : {}),
        forcePathStyle: env.s3.forcePathStyle,
        credentials: {
          accessKeyId: env.s3.accessKeyId,
          secretAccessKey: env.s3.secretAccessKey,
        },
      });
    })();
  }
  return s3ClientPromise;
}

function objectKey(filename) {
  const safe = basename(filename);
  return env.s3.prefix ? `${env.s3.prefix}/${safe}` : safe;
}

function publicUrl(filename) {
  return `${env.s3.publicUrl}/${objectKey(filename)}`;
}

async function putObject(filename, body, contentType, contentLength) {
  const [{ PutObjectCommand }, client] = await Promise.all([
    import('@aws-sdk/client-s3'),
    getS3Client(),
  ]);

  await client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: objectKey(filename),
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
      ...(contentLength != null ? { ContentLength: contentLength } : {}),
    }),
  );
}

/**
 * Guarda un buffer en el almacenamiento activo.
 * @returns {Promise<{url: string, size: number}>}
 */
export async function saveBuffer(filename, buffer, contentType = 'application/octet-stream') {
  if (storageDriver === 's3') {
    await putObject(filename, buffer, contentType, buffer.length);
    return { url: publicUrl(filename), size: buffer.length };
  }

  const destination = join(MEDIA_DIR, basename(filename));
  await mkdir(MEDIA_DIR, { recursive: true });
  await writeFile(destination, buffer);
  return { url: `/uploads/${basename(filename)}`, size: buffer.length };
}

/**
 * Mueve un archivo temporal (p. ej. un video subido con multer) al
 * almacenamiento activo. El archivo temporal NO se borra: lo hace el llamador.
 * @returns {Promise<{url: string, size: number}>}
 */
export async function saveFile(filename, tempPath, contentType = 'application/octet-stream') {
  const info = await stat(tempPath);

  if (storageDriver === 's3') {
    await putObject(
      filename,
      createReadStream(tempPath),
      contentType,
      info.size,
    );
    return { url: publicUrl(filename), size: info.size };
  }

  const destination = join(MEDIA_DIR, basename(filename));
  await mkdir(MEDIA_DIR, { recursive: true });
  try {
    await rename(tempPath, destination);
  } catch {
    // Distinto volumen (tmp del SO vs disco de uploads): copiar y listo.
    await copyFile(tempPath, destination);
    await unlink(tempPath).catch(() => {});
  }
  return { url: `/uploads/${basename(filename)}`, size: info.size };
}

/** Información útil para /health (sin exponer credenciales). */
export function storageInfo() {
  return storageDriver === 's3'
    ? { driver: 's3', bucket: env.s3.bucket, publicUrl: env.s3.publicUrl }
    : { driver: 'local', dir: MEDIA_DIR };
}
