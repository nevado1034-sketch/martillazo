import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[pg] Error inesperado en el pool', err.message);
});

export async function pingDatabase() {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}
