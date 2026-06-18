import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function query(text: string, params?: unknown[]) {
  const start = Date.now()
  const res = await pool.query(text, params)
  return { ...res, duration: Date.now() - start }
}

export async function initDB() {
  await query(
    `CREATE TABLE IF NOT EXISTS stress_data (
      id BIGSERIAL PRIMARY KEY,
      session_id UUID,
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      random_data TEXT,
      category_id INTEGER
    )`
  )
  await query(
    `CREATE TABLE IF NOT EXISTS metrics_history (
      id BIGSERIAL PRIMARY KEY,
      recorded_at TIMESTAMP DEFAULT NOW(),
      cpu_percent NUMERIC,
      ram_percent NUMERIC,
      active_db_connections INTEGER,
      http_rps NUMERIC
    )`
  )
  await query(`CREATE INDEX IF NOT EXISTS idx_stress_session ON stress_data(session_id)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_stress_created ON stress_data(created_at)`)
  await query(`CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON metrics_history(recorded_at)`)

  await query(
    `CREATE TABLE IF NOT EXISTS lock_test (
      id INTEGER PRIMARY KEY,
      counter INTEGER NOT NULL DEFAULT 0
    )`
  )
  await query(`INSERT INTO lock_test (id, counter) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`)

  await query(
    `CREATE TABLE IF NOT EXISTS stress_categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    )`
  )
  await query(`
    INSERT INTO stress_categories (name) VALUES ('A'), ('B'), ('C'), ('D'), ('E')
    ON CONFLICT DO NOTHING
  `)

  await query(`ALTER TABLE stress_data ADD COLUMN IF NOT EXISTS category_id INTEGER`)
}

export default pool
