import OsMetrics from '@/components/monitor/OsMetrics'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🖥️ Stress Monitor</h1>
          <p className="text-gray-400 text-sm">Monitoreo de sistema en tiempo real</p>
        </div>
        <Link href="/stress-lab"
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors">
          ⚡ Laboratorio de Stress →
        </Link>
      </div>
      <OsMetrics />
    </main>
  )
}
