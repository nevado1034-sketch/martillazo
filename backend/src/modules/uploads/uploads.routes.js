import { randomUUID } from 'node:crypto';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../utils/errors.js';

/**
 * Uploads de media del vendedor (fotos y video corto del producto).
 *
 * Guarda los archivos en <backend>/uploads/media y los sirve estáticamente
 * en /uploads. Cada archivo devuelve su URL pública construida con el host
 * de la petición, de modo que funcione igual desde el celular (LAN) que
 * desde la máquina local (localhost).
 */

const MEDIA_DIR = resolve(
  fileURLToPath(new URL('../../../uploads/media', import.meta.url)),
);
mkdirSync(MEDIA_DIR, { recursive: true });

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.3gp']);
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-m4v': '.m4v',
  'video/3gpp': '.3gp',
};

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
      if (!mimeRe.test(file.mimetype)) {
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
    (req, res, next) => photoUploader.single('file')(req, res, (err) =>
      err ? handleMulterError(err, req, res, next) : next(),
    ),
    (req, res) => {
      if (!req.file) {
        return res.status(422).json({
          error: { code: 'FILE_REQUIRED', message: 'Adjunta una foto' },
        });
      }
      // Path relativo: funciona igual en localhost, LAN y túnel (proxy Vite).
      const url = `/uploads/${req.file.filename}`;
      return res.status(201).json({
        data: { url, kind: 'photo', size: req.file.size },
      });
    },
  );

  // POST /api/uploads/video — video corto del producto.
  router.post(
    '/video',
    authenticate,
    (req, res, next) => videoUploader.single('file')(req, res, (err) =>
      err ? handleMulterError(err, req, res, next) : next(),
    ),
    (req, res) => {
      if (!req.file) {
        return res.status(422).json({
          error: { code: 'FILE_REQUIRED', message: 'Adjunta un video' },
        });
      }
      const url = `/uploads/${req.file.filename}`;
      return res.status(201).json({
        data: { url, kind: 'video', size: req.file.size },
      });
    },
  );

  return router;
}

export { MEDIA_DIR };
