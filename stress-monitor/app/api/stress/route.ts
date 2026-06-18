import { NextRequest, NextResponse } from 'next/server'
import {
  startCpuStress, stopCpuStress,
  startMemoryStress, stopMemoryStress,
  startHttpStress, stopHttpStress,
  stopAllStress, stressState
} from '@/lib/stress-engine'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, type, value, concurrency, targetUrl } = body

  switch (action) {
    case 'start':
      if (type === 'cpu') startCpuStress(value ?? 2)
      if (type === 'memory') startMemoryStress(value ?? 256)
      if (type === 'http') startHttpStress(concurrency ?? 10, targetUrl ?? '')
      if (type === 'db') stressState.db.active = true
      break
    case 'stop':
      if (type === 'cpu') stopCpuStress()
      if (type === 'memory') stopMemoryStress()
      if (type === 'http') stopHttpStress()
      if (type === 'db') stressState.db.active = false
      break
    case 'stop-all':
      stopAllStress()
      break
  }

  return NextResponse.json({ ok: true, stress: stressState })
}

export async function GET() {
  return NextResponse.json({ stress: stressState })
}
