import Redis from 'ioredis';
import { env } from '../config/env.js';

/**
 * Capa de caché para el estado "caliente" de las subastas (precio vigente y
 * cuenta regresiva). Si REDIS_URL no está definida o la conexión falla, se
 * degrada a un caché en memoria para que el servidor siga funcionando en
 * desarrollo.
 */

const DEFAULT_TTL_MS = 120_000;

export function createCache() {
  if (!env.redisUrl) {
    console.warn('[cache] REDIS_URL no definida -> usando caché en memoria');
    return new MemoryCache();
  }

  const client = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // no reintentar en bucle
  });
  client.on('error', () => {});
  client
    .connect()
    .then(() => console.log('[cache] conectado a Redis'))
    .catch(() =>
      console.warn('[cache] no se pudo conectar a Redis -> caché en memoria'),
    );

  return new RedisCache(client);
}

class RedisCache {
  constructor(client) {
    this.client = client;
    this.memory = new MemoryCache();
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ?? null;
    } catch {
      return this.memory.get(key);
    }
  }

  async set(key, value, ttlMs = DEFAULT_TTL_MS) {
    try {
      await this.client.set(key, value, 'PX', ttlMs);
    } catch {
      this.memory.set(key, value, ttlMs);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch {
      this.memory.del(key);
    }
  }
}

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    this.store.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + ttlMs,
    });
  }

  del(key) {
    this.store.delete(key);
  }
}
