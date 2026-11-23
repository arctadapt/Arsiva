import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config({ path: '.env.development.local' })
dotenv.config()
import { HttpError } from './lib/http.js'

const { Pool } = pg
const url = process.env.DATABASE_URL
const isLocal = !url || /localhost|127\.0\.0\.1/.test(url)

// Pool disimpan di globalThis supaya dipakai ulang antar invocation serverless.
const pool = (globalThis.__arsivaPool ??= url
  ? new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    })
  : null)

function requirePool() {
  if (!pool) throw new HttpError(500, 'Database belum dikonfigurasi. Isi variabel DATABASE_URL.')
  return pool
}

export const query = (text, params) => requirePool().query(text, params)

/** Jalankan beberapa query dalam satu transaksi pada koneksi yang sama. */
export async function tx(fn) {
  const client = await requirePool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
