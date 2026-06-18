import pool from './db'

export interface StressState {
  http: { active: boolean; count: number; errors: number; rps: number }
  db: { active: boolean; count: number; errors: number; type: string }
  cpu: { active: boolean; workers: number }
  memory: { active: boolean; allocatedMB: number }
  lock: { active: boolean; concurrency: number; holdSeconds: number }
}

export const stressState: StressState = {
  http: { active: false, count: 0, errors: 0, rps: 0 },
  db: { active: false, count: 0, errors: 0, type: '' },
  cpu: { active: false, workers: 0 },
  memory: { active: false, allocatedMB: 0 },
  lock: { active: false, concurrency: 0, holdSeconds: 0 }
}

const memoryBuffers: Buffer[] = []
let cpuWorkers: ReturnType<typeof setInterval>[] = []
let httpWorker: ReturnType<typeof setInterval> | null = null
let dbWorker: ReturnType<typeof setInterval> | null = null

export function startCpuStress(workers: number) {
  stopCpuStress()
  stressState.cpu.active = true
  stressState.cpu.workers = workers
  for (let i = 0; i < workers; i++) {
    const w = setInterval(() => {
      const end = Date.now() + 100
      while (Date.now() < end) { Math.sqrt(Math.random() * 999999) }
    }, 110)
    cpuWorkers.push(w)
  }
}

export function stopCpuStress() {
  cpuWorkers.forEach(w => clearInterval(w))
  cpuWorkers = []
  stressState.cpu.active = false
  stressState.cpu.workers = 0
}

export function startMemoryStress(mb: number) {
  stopMemoryStress()
  stressState.memory.active = true
  const buf = Buffer.alloc(mb * 1024 * 1024, 'x')
  memoryBuffers.push(buf)
  stressState.memory.allocatedMB = mb
}

export function stopMemoryStress() {
  memoryBuffers.length = 0
  stressState.memory.active = false
  stressState.memory.allocatedMB = 0
}

export function startHttpStress(concurrency: number, targetUrl: string) {
  stopHttpStress()
  stressState.http.active = true
  stressState.http.count = 0
  stressState.http.errors = 0
  let rpsCount = 0

  const rpsTimer = setInterval(() => {
    stressState.http.rps = rpsCount
    rpsCount = 0
  }, 1000)

  const fire = async () => {
    if (!stressState.http.active) return
    const promises = Array.from({ length: concurrency }, () =>
      fetch(`${targetUrl}/api/stress/http-target`)
        .then(() => { stressState.http.count++; rpsCount++ })
        .catch(() => { stressState.http.errors++ })
    )
    await Promise.allSettled(promises)
    if (stressState.http.active) setTimeout(fire, 50)
  }

  fire()
  httpWorker = rpsTimer
}

export function stopHttpStress() {
  stressState.http.active = false
  if (httpWorker) { clearInterval(httpWorker); httpWorker = null }
  stressState.http.rps = 0
}

export function startLockStress(concurrency: number, holdSeconds: number) {
  stressState.lock.active = true
  stressState.lock.concurrency = concurrency
  stressState.lock.holdSeconds = holdSeconds

  const promises = Array.from({ length: concurrency }, (_, i) =>
    runLockTransaction(1, holdSeconds, i)
  )

  Promise.allSettled(promises).finally(() => {
    stressState.lock.active = false
  })
}

async function runLockTransaction(rowId: number, holdSeconds: number, workerIndex: number) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT * FROM lock_test WHERE id = $1 FOR UPDATE', [rowId])
    if (workerIndex === 0) {
      await client.query('SELECT pg_sleep($1)', [holdSeconds])
    }
    await client.query('UPDATE lock_test SET counter = counter + 1 WHERE id = $1', [rowId])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error en lock contention:', err)
  } finally {
    client.release()
  }
}

export function stopLockStress() {
  stressState.lock.active = false
}

export function stopAllStress() {
  stopCpuStress()
  stopMemoryStress()
  stopHttpStress()
  stopLockStress()
  stressState.db.active = false
  if (dbWorker) { clearInterval(dbWorker); dbWorker = null }
}