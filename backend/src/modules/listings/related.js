/** Tokenización ligera + scoring de anuncios relacionados (PulgasYa MVP). */

const STOP = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'del', 'al', 'por', 'para', 'con', 'sin', 'que', 'se', 'su', 'sus', 'lo',
  'es', 'son', 'muy', 'mas', 'más', 'como', 'the', 'and', 'or', 'gb', 'ram',
]);

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9áéíóúüñ]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function locationTokens(loc) {
  return tokenize(loc);
}

/**
 * Score a candidate vs seed context.
 * Weights: category 50, type 20, title tokens 8 each (cap 40),
 * location overlap 15, price ±30% 10, recency up to 5.
 */
export function scoreRelated(candidate, ctx) {
  let score = 0;
  const reasons = [];

  if (ctx.type && candidate.type === ctx.type) {
    score += 20;
    reasons.push('type');
  } else if (ctx.type && candidate.type !== ctx.type) {
    // Strong preference for same type — still allow but penalize
    score -= 15;
  }

  if (ctx.category && candidate.category === ctx.category) {
    score += 50;
    reasons.push('category');
  }

  const candTokens = new Set(
    tokenize(`${candidate.title} ${candidate.description || ''}`),
  );
  let overlap = 0;
  for (const t of ctx.tokens || []) {
    if (candTokens.has(t)) overlap += 1;
  }
  if (overlap) {
    const tokenScore = Math.min(40, overlap * 8);
    score += tokenScore;
    reasons.push(`tokens:${overlap}`);
  }

  const seedLoc = locationTokens(ctx.location || '');
  const candLoc = locationTokens(candidate.location || '');
  if (seedLoc.length && candLoc.length) {
    const locHit = seedLoc.some((t) => candLoc.includes(t));
    if (locHit) {
      score += 15;
      reasons.push('location');
    }
  }

  const price = Number(candidate.price);
  const ref = Number(ctx.price);
  if (Number.isFinite(price) && Number.isFinite(ref) && ref > 0) {
    const lo = ref * 0.7;
    const hi = ref * 1.3;
    if (price >= lo && price <= hi) {
      score += 10;
      reasons.push('price');
    }
  }

  if (candidate.createdAt) {
    const ageMs = Date.now() - new Date(candidate.createdAt).getTime();
    const days = Math.max(0, ageMs / (24 * 60 * 60 * 1000));
    const recency = Math.max(0, 5 - Math.min(5, days / 14));
    score += recency;
  }

  return { score, reasons };
}

export function rankRelated(candidates, ctx, { limit = 12 } = {}) {
  return candidates
    .map((c) => {
      const { score, reasons } = scoreRelated(c, ctx);
      return { listing: c, score, reasons };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = new Date(a.listing.createdAt || 0).getTime();
      const tb = new Date(b.listing.createdAt || 0).getTime();
      return tb - ta;
    })
    .slice(0, limit)
    .map((r) => r.listing);
}
