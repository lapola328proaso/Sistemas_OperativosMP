import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { stressState, startLockStress, stopLockStress } from '@/lib/stress-engine'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type = 'insert', batch = 10 } = body

  if (!stressState.db.active) {
    stressState.db.active = true
    stressState.db.type = type
  }

  try {
    if (type === 'insert') {
      const promises = Array.from({ length: batch }, () =>
        query(
          `INSERT INTO stress_data (session_id, payload, random_data, category_id) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), JSON.stringify({ ts: Date.now(), rand: Math.random() }), 'x'.repeat(512), Math.ceil(Math.random() * 5)]
        ).then(() => stressState.db.count++)
          .catch(() => stressState.db.errors++)
      )
      await Promise.allSettled(promises)
    } else if (type === 'select') {
      await query(`
        SELECT sc.name, COUNT(*) AS total, AVG(LENGTH(sd.random_data)) AS avg_size
        FROM stress_data sd
        JOIN stress_categories sc ON sd.category_id = sc.id
        GROUP BY sc.name
        ORDER BY total DESC
      `)
      stressState.db.count++
    } else if (type === 'lock') {
      const { concurrency = 10, holdSeconds = 5 } = body
      startLockStress(concurrency, holdSeconds)
    } else if (type === 'mixed') {
      await Promise.allSettled([
        query(
          `INSERT INTO stress_data (session_id, payload, random_data, category_id) VALUES ($1, $2, $3, $4)`,
          [randomUUID(), JSON.stringify({ ts: Date.now() }), 'y'.repeat(256), Math.ceil(Math.random() * 5)]
        ).then(() => stressState.db.count++),
        query(`SELECT count(*) FROM stress_data`).then(() => stressState.db.count++)
      ])
    }
    return NextResponse.json({ ok: true, count: stressState.db.count })
  } catch (e) {
    stressState.db.errors++
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE() {
  stopLockStress()
  stressState.db.active = false
  return NextResponse.json({ ok: true })
}
