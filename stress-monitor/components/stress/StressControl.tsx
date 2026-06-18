'use client'
import { useState } from 'react'

interface StressStatus {
  http: { active: boolean; count: number; errors: number; rps: number }
  db: { active: boolean; count: number; errors: number }
  cpu: { active: boolean; workers: number }
  memory: { active: boolean; allocatedMB: number }
  lock: { active: boolean; concurrency: number; holdSeconds: number }
}

export default function StressControl() {
  const [status, setStatus] = useState<StressStatus | null>(null)
  const [cpuWorkers, setCpuWorkers] = useState(2)
  const [memMB, setMemMB] = useState(256)
  const [httpConcurrency, setHttpConcurrency] = useState(20)
const [dbType, setDbType] = useState('insert')
  const [dbBatch, setDbBatch] = useState(10)
  const [lockConcurrency, setLockConcurrency] = useState(10)
  const [lockHoldSeconds, setLockHoldSeconds] = useState(5)
  const [log, setLog] = useState<string[]>([])

  const addLog = (msg: string) => setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 49)])

  const action = async (body: object) => {
    try {
      const res = await fetch('/api/stress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      setStatus(data.stress)
      addLog(`${body['action']} ${body['type'] || 'all'} → ok`)
    } catch (e) {
      addLog(`Error: ${e}`)
    }
  }

  const dbStress = async () => {
    try {
      const res = await fetch('/api/stress/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: dbType, batch: dbBatch })
      })
      const data = await res.json()
      addLog(`DB ${dbType} batch=${dbBatch} → count=${data.count}`)
    } catch (e) {
      addLog(`DB error: ${e}`)
    }
  }

  const lockStress = async () => {
    try {
      const res = await fetch('/api/stress/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lock', concurrency: lockConcurrency, holdSeconds: lockHoldSeconds })
      })
      const data = await res.json()
      addLog(`Lock contention: ${lockConcurrency} workers, hold=${lockHoldSeconds}s → ${data.message || 'iniciado'}`)
    } catch (e) {
      addLog(`Lock error: ${e}`)
    }
  }

  const stopLock = async () => {
    try {
      await fetch('/api/stress/db', { method: 'DELETE' })
      addLog('Lock contention detenido')
    } catch (e) {
      addLog(`Lock stop error: ${e}`)
    }
  }

  const stopAll = async () => {
    await action({ action: 'stop-all' })
    addLog('🛑 TODOS LOS STRESS DETENIDOS')
  }

  const Slider = ({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span><span className="text-white font-bold">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-orange-500" />
    </div>
  )

  return (
    <div className="space-y-4">
      <button onClick={stopAll}
        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xl rounded-xl border-2 border-red-400 transition-all active:scale-95">
        🛑 DETENER TODO
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-orange-400">🔥 CPU Burn</h3>
            {status?.cpu.active && <span className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded-full">ACTIVO</span>}
          </div>
          <Slider label="Workers" value={cpuWorkers} min={1} max={16} onChange={setCpuWorkers} />
          <div className="flex gap-2">
            <button onClick={() => action({ action: 'start', type: 'cpu', value: cpuWorkers })}
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-bold">Iniciar</button>
            <button onClick={() => action({ action: 'stop', type: 'cpu' })}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Detener</button>
          </div>
        </div>

        {/* Memoria */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-blue-400">💾 Memory Pressure</h3>
            {status?.memory.active && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full">ACTIVO {status.memory.allocatedMB}MB</span>}
          </div>
          <Slider label="Megabytes a alocar" value={memMB} min={64} max={2048} step={64} onChange={setMemMB} />
          <div className="flex gap-2">
            <button onClick={() => action({ action: 'start', type: 'memory', value: memMB })}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold">Alocar</button>
            <button onClick={() => action({ action: 'stop', type: 'memory' })}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Liberar</button>
          </div>
        </div>

        {/* HTTP */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-green-400">🌊 HTTP Flood</h3>
            {status?.http.active && <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">ACTIVO {status.http.rps} rps</span>}
          </div>
          <Slider label="Concurrencia" value={httpConcurrency} min={5} max={200} step={5} onChange={setHttpConcurrency} />
          <div className="flex gap-2">
            <button onClick={() => action({ action: 'start', type: 'http', concurrency: httpConcurrency, targetUrl: 'http://localhost:3000' })}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold">Iniciar</button>
            <button onClick={() => action({ action: 'stop', type: 'http' })}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Detener</button>
          </div>
          {status?.http.active && (
            <div className="mt-2 text-xs text-gray-400">
              Total: {status.http.count} | Errores: {status.http.errors}
            </div>
          )}
        </div>

        {/* DB */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-purple-400">🗄️ DB Overload</h3>
            {status?.db.active && <span className="text-xs bg-purple-900 text-purple-300 px-2 py-1 rounded-full">ACTIVO</span>}
          </div>
          <div className="mb-3">
            <select value={dbType} onChange={e => setDbType(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm text-white">
              <option value="insert">INSERT masivo</option>
              <option value="select">SELECT pesado</option>
              <option value="mixed">Mixed (insert + select)</option>
            </select>
          </div>
          <Slider label="Batch size" value={dbBatch} min={1} max={100} onChange={setDbBatch} />
          <div className="flex gap-2">
            <button onClick={dbStress}
              className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold">Ejecutar batch</button>
            <button onClick={() => action({ action: 'stop', type: 'db' })}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Detener</button>
          </div>
          {status?.db.active && (
            <div className="mt-2 text-xs text-gray-400">
              Queries: {status.db.count} | Errores: {status.db.errors}
            </div>
          )}
        </div>

        {/* Lock Contention */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-yellow-400">🔒 Lock Contention</h3>
            {status?.lock?.active && <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded-full">ACTIVO</span>}
          </div>
          <Slider label="Concurrencia (transacciones)" value={lockConcurrency} min={2} max={50} onChange={setLockConcurrency} />
          <Slider label="Hold seconds (duración del lock)" value={lockHoldSeconds} min={1} max={30} onChange={setLockHoldSeconds} />
          <div className="flex gap-2">
            <button onClick={lockStress}
              className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-bold">Iniciar</button>
            <button onClick={stopLock}
              className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Detener</button>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-2">📋 Log en tiempo real</div>
        <div className="h-40 overflow-y-auto font-mono text-xs space-y-1">
          {log.length === 0 && <div className="text-gray-600">Sin eventos aún...</div>}
          {log.map((l, i) => <div key={i} className="text-green-400">{l}</div>)}
        </div>
      </div>
    </div>
  )
}
