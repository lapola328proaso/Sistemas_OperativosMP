import { readFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)
export interface OsMetrics { cpu: { percent: number; loadAvg: [number,number,number] }; memory: { total: number; used: number; percent: number; buffers: number; cached: number }; swap: { total: number; used: number }; disk: { reads: number; writes: number }; network: { rx_bytes: number; tx_bytes: number }; processes: { pid: string; user: string; cpu: string; mem: string; command: string }[] }
export async function collectMetrics(): Promise<OsMetrics> {
  const [cpuRaw, memRaw, diskRaw, netRaw, psRaw] = await Promise.all([readFile('/proc/stat','utf8'), readFile('/proc/meminfo','utf8'), readFile('/proc/diskstats','utf8'), readFile('/proc/net/dev','utf8'), execAsync('ps aux --sort=-%cpu | head -10').then(r=>r.stdout)])
  const cpuLine = cpuRaw.split('\n')[0].split(/\s+/).slice(1).map(Number)
  const idle = cpuLine[3] + (cpuLine[4] || 0)
  const total = cpuLine.reduce((a,b)=>a+b,0)
  const percent = total ? (1 - idle/total)*100 : 0
  const loadAvg = (await readFile('/proc/loadavg','utf8')).split(' ').slice(0,3).map(Number) as [number,number,number]
  const mem: Record<string,number> = {}
  memRaw.split('\n').forEach(l=>{ const [k,v]=l.split(':'); if(k&&v) mem[k.trim()]=parseInt(v)*1024 })
  const total_mem = mem['MemTotal']||0
  const free_mem = mem['MemFree']||0
  const buffers = mem['Buffers']||0
  const cached = mem['Cached']||0
  const used = total_mem - free_mem - buffers - cached
  const diskLine = diskRaw.split('\n').find(l=>l.includes(' sda ')||l.includes(' vda ')||l.includes(' nvme'))
  const dp = diskLine?.trim().split(/\s+/)||[]
  const netLine = netRaw.split('\n').find(l=>l.includes('eth0')||l.includes('ens')||l.includes('enp'))
  const np = netLine?.trim().split(/\s+/)||[]
  const processes = psRaw.split('\n').slice(1).filter(Boolean).map(l=>{ const p=l.trim().split(/\s+/); return { pid:p[1], user:p[0], cpu:p[2], mem:p[3], command:p[10]||'' } })
  return { cpu:{percent,loadAvg}, memory:{total:total_mem,used,free:free_mem,percent:total_mem?(used/total_mem)*100:0,buffers,cached}, swap:{total:mem['SwapTotal']||0,used:(mem['SwapTotal']||0)-(mem['SwapFree']||0)}, disk:{reads:parseInt(dp[3])||0,writes:parseInt(dp[7])||0}, network:{rx_bytes:parseInt(np[1])||0,tx_bytes:parseInt(np[9])||0}, processes }
}
