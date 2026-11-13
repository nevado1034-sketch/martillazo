import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { Router } from 'express';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';

/**
 * Uploads de media del vendedor (fotos y video corto del producto).
 *
 * Guarda los archivos en UPLOADS_DIR (por defecto <backend>/uploads/media) y
 * los sirve estáticamente en /uploads. En producción configura UPLOADS_DIR a
 * un disco persistente: el disco local de Render es efímero y borra las fotos
 * en cada redeploy.
 *
 * Las fotos se normalizan a JPEG (máx. 1600 px) para que se vean igual en
 * iPhone, Android y escritorio. HEIC/HEIF de iPhone se convierte a JPEG.
 */

const DEFAULT_MEDIA_DIR = resolve(
  fileURLToPath(new URL('../../../uploads/media', import.meta.url)),
);
const MEDIA_DIR = env.uploadsDir ? resolve(env.uploadsDir) : DEFAULT_MEDIA_DIR;
mkdirSync(MEDIA_DIR, { recursive: true });

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
    destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
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

/**
 * Convierte la foto subida a JPEG optimizado (y corrige la orientación EXIF).
 * HEIC/HEIF se decodifica con libheif (JS/WASM) porque los binarios de sharp
 * no incluyen el códec HEVC de Apple.
 */
async function processPhoto(file) {
  const originalExt = extname(file.originalname || '').toLowerCase();
  const isHeic =
    HEIC_MIME_RE.test(file.mimetype || '') || HEIC_EXT_RE.test(originalExt);

  try {
    let input = file.path;
    if (isHeic) {
      const buffer = await readFile(file.path);
      input = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
    }

    const filename = `${randomUUID()}.jpg`;
    const outputPath = join(MEDIA_DIR, filename);

    try {
      const info = await sharp(input)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(outputPath);

      return { url: `/uploads/${filename}`, size: info.size };
    } catch {
      await unlink(outputPath).catch(() => {});
      throw new AppError({
        code: 'PHOTO_PROCESS_FAILED',
        message: 'No pudimos procesar esta foto. Intenta con otra imagen.',
        status: 422,
      });
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError({
      code: 'PHOTO_CONVERT_FAILED',
      message:
        'No pudimos convertir esta foto. Prueba con otra o expórtala como JPG.',
      status: 422,
    });
  } finally {
    await unlink(file.path).catch(() => {});
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
    (req, res) => {
      if (!req.file) {
        return res.status(422).json({
          error: { code: 'FILE_REQUIRED', message: 'Adjunta un video' },
        });
      }
      // Path relativo: funciona igual en localhost, LAN y túnel (proxy Vite).
      const url = `/uploads/${req.file.filename}`;
      return res.status(201).json({
        data: { url, kind: 'video', size: req.file.size },
      });
    },
  );

  return router;
}

export { MEDIA_DIR };
