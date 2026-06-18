'use client'
import { useEffect, useState, useRef } from 'react'

interface Metrics {
  os: {
    cpu: { percent: number; loadAvg: [number, number, number] }
    memory: { total: number; used: number; percent: number; buffers: number; cached: number }
    swap: { total: number; used: number }
    disk: { reads: number; writes: number }
    network: { rx_bytes: number; tx_bytes: number }
    processes: { pid: string; user: string; cpu: string; mem: string; command: string }[]
  }
  stress: {
    http: { active: boolean; count: number; errors: number; rps: number }
    db: { active: boolean; count: number; errors: number }
    cpu: { active: boolean; workers: number }
    memory: { active: boolean; allocatedMB: number }
  }
  db: { activeConnections: number; queryDuration: number }
}

const fmt = (bytes: number) => {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + ' GB'
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' MB'
  return (bytes / 1e3).toFixed(0) + ' KB'
}

const MAX_POINTS = 60

export default function OsMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [history, setHistory] = useState<{ cpu: number[]; ram: number[] }>({ cpu: [], ram: [] })
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics')
      if (!res.ok) throw new Error('Error ' + res.status)
      const data = await res.json()
      if (!data.os || !data.stress || !data.db) throw new Error('Respuesta incompleta')
      setMetrics(data)
      setHistory(prev => ({
        cpu: [...prev.cpu.slice(-(MAX_POINTS - 1)), data.os.cpu.percent],
        ram: [...prev.ram.slice(-(MAX_POINTS - 1)), data.os.memory.percent]
      }))
      setError('')
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    fetchMetrics()
    intervalRef.current = setInterval(fetchMetrics, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const MiniChart = ({ data, color }: { data: number[]; color: string }) => {
    const w = 300, h = 60
    if (data.length < 2) return <div className="w-full h-[60px] bg-gray-800 rounded" />
    const points = data.map((v, i) => {
      const x = (i / (MAX_POINTS - 1)) * w
      const y = h - (v / 100) * h
      return `${x},${y}`
    }).join(' ')
    return (
      <svg width={w} height={h} className="rounded bg-gray-800 w-full">
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    )
  }

  const Bar = ({ value, color }: { value: number; color: string }) => (
    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }} />
    </div>
  )

  if (!metrics) return (
    <div className="flex items-center justify-center h-48 text-gray-400">
      {error ? `Error: ${error}` : 'Cargando...'}
    </div>
  )

  const { os, stress, db } = metrics
  const cpuPct = Math.round(os.cpu.percent)
  const ramPct = Math.round(os.memory.percent)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">CPU</div>
          <div className={`text-3xl font-bold ${cpuPct > 80 ? 'text-red-400' : cpuPct > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
            {cpuPct}%
          </div>
          <Bar value={cpuPct} color={cpuPct > 80 ? '#f87171' : cpuPct > 50 ? '#facc15' : '#4ade80'} />
          <div className="text-xs text-gray-500 mt-1">Load: {os.cpu.loadAvg[0].toFixed(2)}</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">RAM</div>
          <div className={`text-3xl font-bold ${ramPct > 80 ? 'text-red-400' : ramPct > 60 ? 'text-yellow-400' : 'text-blue-400'}`}>
            {ramPct}%
          </div>
          <Bar value={ramPct} color={ramPct > 80 ? '#f87171' : '#60a5fa'} />
          <div className="text-xs text-gray-500 mt-1">{fmt(os.memory.used)} / {fmt(os.memory.total)}</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">DB Conexiones</div>
          <div className="text-3xl font-bold text-purple-400">{db.activeConnections}</div>
          <div className="text-xs text-gray-500 mt-2">Query: {db.queryDuration}ms</div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-1">HTTP RPS</div>
          <div className={`text-3xl font-bold ${stress?.http?.active ? 'text-orange-400' : 'text-gray-400'}`}>
            {stress?.http?.rps ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Total: {stress?.http?.count ?? 0} | Err: {stress?.http?.errors ?? 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-2">CPU % — últimos 60s</div>
          <MiniChart data={history.cpu} color="#4ade80" />
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="text-xs text-gray-400 mb-2">RAM % — últimos 60s</div>
          <MiniChart data={history.ram} color="#60a5fa" />
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <div className="text-xs text-gray-400 mb-2">Top procesos por CPU</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left pb-1">PID</th>
              <th className="text-left pb-1">USER</th>
              <th className="text-left pb-1">CPU%</th>
              <th className="text-left pb-1">MEM%</th>
              <th className="text-left pb-1">CMD</th>
            </tr>
          </thead>
          <tbody>
            {os.processes.map((p, i) => (
              <tr key={i} className="border-b border-gray-700/50">
                <td className="py-1 text-yellow-300">{p.pid}</td>
                <td className="py-1 text-gray-300">{p.user}</td>
                <td className={`py-1 ${parseFloat(p.cpu) > 50 ? 'text-red-400' : 'text-green-400'}`}>{p.cpu}</td>
                <td className="py-1 text-blue-400">{p.mem}</td>
                <td className="py-1 text-gray-400 truncate max-w-[120px]">{p.command}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-4 text-sm">
          <div className="text-xs text-gray-400 mb-2">Red</div>
          <div>RX: <span className="text-green-400">{fmt(os.network.rx_bytes)}</span></div>
          <div>TX: <span className="text-blue-400">{fmt(os.network.tx_bytes)}</span></div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 text-sm">
          <div className="text-xs text-gray-400 mb-2">Swap</div>
          <div>Total: <span className="text-gray-300">{fmt(os.swap.total)}</span></div>
          <div>Usado: <span className={os.swap.used > 0 ? 'text-yellow-400' : 'text-green-400'}>{fmt(os.swap.used)}</span></div>
        </div>
      </div>
    </div>
  )
}
