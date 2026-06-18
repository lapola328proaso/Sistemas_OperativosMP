import StressControl from '@/components/stress/StressControl'
import OsMetrics from '@/components/monitor/OsMetrics'
import Link from 'next/link'

export default function StressLab() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">⚡ Laboratorio de Stress</h1>
          <p className="text-gray-400 text-sm">Sobrecarga controlada del sistema</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors">
          ← Dashboard
        </Link>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StressControl />
        <OsMetrics />
      </div>
    </main>
  )
}
