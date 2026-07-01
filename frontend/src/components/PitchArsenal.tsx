import { useMemo } from 'react'

import { panelClass } from './PageShell'

interface Pitch {
  pitch_type: string
  pitch_name: string
  release_speed: number
  release_spin_rate: number
  pfx_x: number
  pfx_z: number
}

interface PitchArsenalProps {
  pitches: Pitch[]
  title?: string
}

interface Row {
  key: string
  name: string
  count: number
  veloSum: number
  veloN: number
  spinSum: number
  spinN: number
  hSum: number
  vSum: number
  movN: number
}

const PitchArsenal = ({ pitches, title = 'Arsenal' }: PitchArsenalProps) => {
  const rows = useMemo(() => {
    const map = new Map<string, Row>()
    for (const p of pitches) {
      const key = p.pitch_type || 'UNK'
      let row = map.get(key)
      if (!row) {
        row = {
          key,
          name: p.pitch_name || p.pitch_type || 'Unknown',
          count: 0,
          veloSum: 0,
          veloN: 0,
          spinSum: 0,
          spinN: 0,
          hSum: 0,
          vSum: 0,
          movN: 0,
        }
        map.set(key, row)
      }
      row.count++
      if (p.release_speed) { row.veloSum += p.release_speed; row.veloN++ }
      if (p.release_spin_rate) { row.spinSum += p.release_spin_rate; row.spinN++ }
      if (p.pfx_x || p.pfx_z) { row.hSum += p.pfx_x; row.vSum += p.pfx_z; row.movN++ }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [pitches])

  if (!pitches.length) return null
  const total = pitches.length

  return (
    <div className={`flex flex-col gap-2 p-3 text-xs text-gray-200 ${panelClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-100">{title}</span>
        <span className="text-gray-400">{total} pitches</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-[10px] uppercase tracking-wide text-gray-500">
          <span>Type</span>
          <span className="text-right">N (%)</span>
          <span className="text-right">Velo</span>
          <span className="text-right">Spin</span>
          <span className="text-right">Break H/V</span>
        </div>
        {rows.map((r) => {
          const pct = ((r.count / total) * 100).toFixed(0)
          const velo = r.veloN ? (r.veloSum / r.veloN).toFixed(1) : '—'
          const spin = r.spinN ? Math.round(r.spinSum / r.spinN).toString() : '—'
          const h = r.movN ? ((r.hSum / r.movN) * 12).toFixed(1) : '—'
          const v = r.movN ? ((r.vSum / r.movN) * 12).toFixed(1) : '—'
          return (
            <div key={r.key} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2">
              <span className="truncate text-gray-100" title={r.name}>{r.name}</span>
              <span className="text-right tabular-nums text-gray-300">{r.count} ({pct}%)</span>
              <span className="text-right tabular-nums text-gray-300">{velo}</span>
              <span className="text-right tabular-nums text-gray-300">{spin}</span>
              <span className="text-right tabular-nums text-gray-300">{h}/{v}"</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PitchArsenal
