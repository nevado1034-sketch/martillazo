import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import multer from 'multer';
import { Router } from 'express';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';
import { MEDIA_DIR, saveBuffer, saveFile } from '../../services/storage.js';

/**
 * Uploads de media del vendedor (fotos y video corto del producto).
 *
 * Los archivos se escriben primero en una carpeta temporal y luego se guardan
 * con el driver de almacenamiento activo (local o S3/R2). Ver services/storage.js.
 *
 * Las fotos se normalizan a JPEG (máx. 1600 px, orientación EXIF corregida)
 * para que se vean igual en iPhone, Android y escritorio. HEIC/HEIF de iPhone
 * se convierte a JPEG.
 */

// Temporales de multer: fuera del disco de uploads, para no servirlos nunca.
const TMP_DIR = join(tmpdir(), 'pulgasya-uploads');
mkdirSync(TMP_DIR, { recursive: true });

const IMAGE_EXTS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
]);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.3gp']);
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
  'video/3gpp': '.3gp',
};

const HEIC_MIME_RE = /^image\/hei[cf]$/i;
const HEIC_EXT_RE = /\.(heic|heif)$/i;

// Se acepta cualquier imagen/video; así funcionan archivos reales del celular
// (HEIC, MOV, 3GP, nombres sin extensión). La extensión se deriva del MIME.
function makeUploader({ mimeRe, exts, maxBytes, kind }) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, TMP_DIR),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      const safeExt = exts.has(ext) ? ext : MIME_TO_EXT[file.mimetype] ?? '';
      cb(null, `${randomUUID()}${safeExt}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxBytes },
    fileFilter: (_req, file, cb) => {
      const isHeic =
        kind === 'photo' &&
        (HEIC_MIME_RE.test(file.mimetype || '') ||
          HEIC_EXT_RE.test(file.originalname || ''));

      if (!mimeRe.test(file.mimetype) && !isHeic) {
        return cb(
          new AppError({
            code: 'UNSUPPORTED_FILE',
            message:
              kind === 'photo'
                ? 'Formato no soportado. Usa una foto (JPG, PNG, WEBP o GIF)'
                : 'Formato no soportado. Usa un video (MP4, MOV, WebM o 3GP)',
            status: 422,
          }),
        );
      }
      return cb(null, true);
    },
  });
}

const photoUploader = makeUploader({
  mimeRe: /^image\//,
  exts: IMAGE_EXTS,
  maxBytes: 15 * 1024 * 1024,
  kind: 'photo',
});
const videoUploader = makeUploader({
  mimeRe: /^video\//,
  exts: VIDEO_EXTS,
  maxBytes: 100 * 1024 * 1024,
  kind: 'video',
});

function storageError() {
  return new AppError({
    code: 'STORAGE_FAILED',
    message: 'No pudimos guardar tu archivo. Intenta de nuevo en unos minutos.',
    status: 502,
  });
}

/**
 * Convierte la foto subida a JPEG optimizado (y corrige la orientación EXIF).
 * HEIC/HEIF se decodifica con libheif (JS/WASM) porque los binarios de sharp
 * no incluyen el códec HEVC de Apple.
 */
async function processPhoto(file) {
  const originalExt = extname(file.originalname || '').toLowerCase();
  const isHeic =
    HEIC_MIME_RE.test(file.mimetype || '') || HEIC_EXT_RE.test(originalExt);

  let jpeg;
  try {
    let input = file.path;
    if (isHeic) {
      const buffer = await readFile(file.path);
      input = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
    }

    const { data } = await sharp(input)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    jpeg = data;
  } catch {
    throw new AppError({
      code: 'PHOTO_PROCESS_FAILED',
      message:
        'No pudimos procesar esta foto. Prueba con otra o expórtala como JPG.',
      status: 422,
    });
  } finally {
    await unlink(file.path).catch(() => {});
  }

  try {
    return await saveBuffer(`${randomUUID()}.jpg`, jpeg, 'image/jpeg');
  } catch (err) {
    console.error('[uploads] error guardando foto', err);
    throw storageError();
  }
}

/** Traduce errores de Multer (tamaño máximo, etc.) a un JSON amigable. */
function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(422).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'El archivo supera el tamaño máximo permitido',
      },
    });
  }
  return next(err);
}

export function createUploadsRouter() {
  const router = Router();

  // POST /api/uploads/photo — captura desde el celular o galería.
  router.post(
    '/photo',
    authenticate,
    (req, res, next) =>
      photoUploader.single('file')(req, res, (err) =>
        err ? handleMulterError(err, req, res, next) : next(),
      ),
    async (req, res, next) => {
      if (!req.file) {
        return res.status(422).json({
          error: { code: 'FILE_REQUIRED', message: 'Adjunta una foto' },
        });
      }

      try {
        const photo = await processPhoto(req.file);
        return res.status(201).json({
          data: { url: photo.url, kind: 'photo', size: photo.size },
        });
      } catch (err) {
        await unlink(req.file.path).catch(() => {});
        return next(err);
      }
    },
  );

  // POST /api/uploads/video — video corto del producto.
  router.post(
    '/video',
    authenticate,
    (req, res, next) =>
      videoUploader.single('file')(req, res, (err) =>
        err ? handleMulterError(err, req, res, next) : next(),
      ),
    async (req, res, next) => {
      if (!req.file) {
        return res.status(422).json({
          error: { code: 'FILE_REQUIRED', message: 'Adjunta un video' },
        });
      }

      try {
        const video = await saveFile(
          req.file.filename,
          req.file.path,
          req.file.mimetype || 'video/mp4',
        );
        return res.status(201).json({
          data: { url: video.url, kind: 'video', size: video.size },
        });
      } catch (err) {
        console.error('[uploads] error guardando video', err);
        return next(storageError());
      } finally {
        await unlink(req.file.path).catch(() => {});
      }
    },
  );

  return router;
}

export { MEDIA_DIR };
