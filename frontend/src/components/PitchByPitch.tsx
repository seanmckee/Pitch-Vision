import { useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { groupByInning, groupByAtBat, type PitchLike } from '../lib/pitchGroups'

interface Pitch extends PitchLike {
  pitch_type: string
  pitch_name: string
  description: string
  release_speed: number
  effective_speed: number
  release_spin_rate: number
  spin_axis: number
  pfx_x: number
  pfx_z: number
  release_pos_x: number
  release_pos_z: number
  release_extension: number
  zone: number
  stand: string
  p_throws: string
  balls: number
  strikes: number
  outs_when_up: number
  launch_speed: number
  launch_angle: number
  bb_type: string
  hit_distance_sc: number
  estimated_ba_using_speedangle: number
  estimated_woba_using_speedangle: number
}

interface PitchByPitchProps {
  pitches: Pitch[]
  index: number
  onIndexChange: (i: number) => void
  fullTrail: boolean
  onFullTrailChange: (b: boolean) => void
}

const formatDescription = (d: string) =>
  d ? d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''

const PitchByPitch = ({
  pitches,
  index,
  onIndexChange,
  fullTrail,
  onFullTrailChange,
}: PitchByPitchProps) => {
  const current = pitches[index]
  const inningGroups = useMemo(() => groupByInning(pitches), [pitches])
  const atBatStartIndex = useMemo(() => {
    const map = new Map<number, number>()
    pitches.forEach((p, i) => {
      if (!map.has(p.at_bat_number)) map.set(p.at_bat_number, i)
    })
    return map
  }, [pitches])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (e.key === 'ArrowRight' && index < pitches.length - 1) {
        e.preventDefault()
        onIndexChange(index + 1)
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault()
        onIndexChange(index - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, pitches.length, onIndexChange])

  if (!pitches.length || !current) {
    return <div className="text-sm text-gray-400">No pitches to walk through.</div>
  }

  const stat = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '' || value === 0) return null
    return (
      <div className="flex justify-between gap-3">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-100">{value}</span>
      </div>
    )
  }

  const pitchName = current.pitch_name || current.pitch_type || '—'
  const velo = current.release_speed ? `${current.release_speed.toFixed(1)} mph` : null
  const spin = current.release_spin_rate
    ? `${Math.round(current.release_spin_rate)} rpm${current.spin_axis ? ` @ ${Math.round(current.spin_axis)}°` : ''}`
    : null
  const breakStr =
    current.pfx_x || current.pfx_z
      ? `${(current.pfx_x * 12).toFixed(1)}" H · ${(current.pfx_z * 12).toFixed(1)}" V`
      : null
  const exitLA =
    current.launch_speed || current.launch_angle
      ? `${current.launch_speed ? `${current.launch_speed.toFixed(1)} mph` : '—'} · ${current.launch_angle ? `${current.launch_angle.toFixed(0)}°` : '—'}`
      : null
  const hitDist = current.hit_distance_sc ? `${Math.round(current.hit_distance_sc)} ft` : null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/15 p-3">
      <div className="flex flex-col gap-1 text-sm">
        <div className="font-semibold text-gray-100">
          {current.inning_topbot} {current.inning} — {current.batter_name || `Batter #${current.batter}`}
          {current.stand ? <span className="ml-1 text-gray-400">({current.stand}HB)</span> : null}
        </div>
        <div className="text-xs text-gray-400">
          Count {current.balls}-{current.strikes} · {current.outs_when_up} out · Pitch {current.pitch_number} of AB
        </div>
        <div className="mt-1 grid grid-cols-1 gap-0.5 text-xs">
          {stat('Pitch', pitchName)}
          {stat('Velo', velo)}
          {stat('Spin', spin)}
          {stat('Break', breakStr)}
          {stat('Result', formatDescription(current.description))}
          {current.events && current.events !== '0' ? stat('Outcome', formatDescription(current.events)) : null}
          {stat('Exit / LA', exitLA)}
          {stat('Hit dist', hitDist)}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onIndexChange(Math.max(0, index - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="size-4" /> Prev
        </Button>
        <span className="text-xs text-gray-400">
          {index + 1} / {pitches.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onIndexChange(Math.min(pitches.length - 1, index + 1))}
          disabled={index === pitches.length - 1}
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
        <input
          type="checkbox"
          checked={fullTrail}
          onChange={(e) => onFullTrailChange(e.target.checked)}
          className="size-3.5 accent-emerald-400"
        />
        Show full game trail
      </label>

      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
        {inningGroups.map((g) => {
          const abs = groupByAtBat(g.pitches)
          return (
            <div key={g.key} className="flex flex-col gap-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {g.topbot} {g.inning}
              </div>
              <div className="flex flex-wrap gap-1">
                {abs.map((ab) => {
                  const isCurrent = ab.atBatNumber === current.at_bat_number
                  const startIdx = atBatStartIndex.get(ab.atBatNumber) ?? 0
                  const lastName = ab.batterName?.split(' ').slice(-1)[0] || `#${ab.batter}`
                  return (
                    <button
                      key={ab.atBatNumber}
                      type="button"
                      onClick={() => onIndexChange(startIdx)}
                      className={`rounded-md border px-2 py-1 text-xs transition ${
                        isCurrent
                          ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100'
                          : 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
                      }`}
                      title={ab.result ? `${ab.batterName} — ${formatDescription(ab.result)}` : ab.batterName}
                    >
                      {lastName}
                      {ab.result ? ` · ${formatDescription(ab.result)}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PitchByPitch
