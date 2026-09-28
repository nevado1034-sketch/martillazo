import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string compare for secrets (length mismatch → false).
 */
export function secretsEqual(expected, provided) {
  if (typeof expected !== 'string' || typeof provided !== 'string') return false;
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
