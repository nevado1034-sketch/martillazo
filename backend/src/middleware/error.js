export function notFound(_req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' },
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error('[api] error', err);

  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message: status >= 500 ? 'Error interno del servidor' : err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}
