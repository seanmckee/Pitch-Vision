import { useMemo } from 'react'
import { groupByInning, groupByAtBat, type PitchLike } from '../lib/pitchGroups'
import { panelClass } from './PageShell'

interface GameLogProps {
  pitches: PitchLike[]
  title: string
  selectedAtBat: number | null
  onSelectAtBat: (atBatNumber: number) => void
  matchup?: { away?: string; home?: string; date?: string }
}

const formatResult = (r: string) =>
  r ? r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''

const GameLog = ({ pitches, title, selectedAtBat, onSelectAtBat, matchup }: GameLogProps) => {
  const inningGroups = useMemo(() => groupByInning(pitches), [pitches])

  if (!pitches.length) {
    return (
      <div className={`p-3 text-sm text-gray-400 ${panelClass}`}>No pitches to show.</div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 p-3 ${panelClass}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-gray-100">{title}</span>
        {matchup && (matchup.away || matchup.home) ? (
          <span className="text-xs text-gray-400">
            {matchup.away} @ {matchup.home}
            {matchup.date ? ` · ${matchup.date}` : ''}
          </span>
        ) : null}
      </div>

      <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
        {inningGroups.map((g) => {
          const abs = groupByAtBat(g.pitches)
          return (
            <div key={g.key} className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {g.topbot} {g.inning}
              </div>
              <div className="flex flex-col gap-1">
                {abs.map((ab) => {
                  const isCurrent = ab.atBatNumber === selectedAtBat
                  const name = ab.batterName || `Batter #${ab.batter}`
                  return (
                    <button
                      key={ab.atBatNumber}
                      type="button"
                      onClick={() => onSelectAtBat(ab.atBatNumber)}
                      className={`flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
                        isCurrent
                          ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate font-medium">{name}</span>
                      <span className="flex shrink-0 items-center gap-2 text-gray-400">
                        {ab.result ? (
                          <span className="text-gray-300">{formatResult(ab.result)}</span>
                        ) : null}
                        <span className="tabular-nums">{ab.pitches.length}P</span>
                      </span>
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

export default GameLog
