import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import StrikeZone from './components/StrikeZone'
import PitchLegend from './components/PitchLegend'
import PitchByPitch from './components/PitchByPitch'
import PitchArsenal from './components/PitchArsenal'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Calendar } from './components/ui/calendar'
import {Popover, PopoverContent, PopoverTrigger} from './components/ui/popover'
import { sortPitches, groupByInning, groupByAtBat } from './lib/pitchGroups'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Pitch {
  pitch_type: string
  pitch_name: string
  plate_x: number
  plate_z: number
  description: string
  type: string
  release_speed: number
  effective_speed: number
  release_spin_rate: number
  spin_axis: number
  release_pos_x: number
  release_pos_z: number
  release_extension: number
  pfx_x: number
  pfx_z: number
  zone: number
  sz_top: number
  sz_bot: number
  game_pk: number
  game_date: string
  home_team: string
  away_team: string
  inning_topbot: string
  inning: number
  at_bat_number: number
  pitch_number: number
  batter: number
  batter_name: string
  stand: string
  p_throws: string
  balls: number
  strikes: number
  outs_when_up: number
  events: string
  launch_speed: number
  launch_angle: number
  bb_type: string
  hit_distance_sc: number
  estimated_ba_using_speedangle: number
  estimated_woba_using_speedangle: number
}

type LoadingStage = null | 'player' | 'games' | 'pitches'

const LOADING_LABELS: Record<Exclude<LoadingStage, null>, string> = {
  player: 'Finding pitcher…',
  games: 'Loading game dates…',
  pitches: 'Loading pitches…',
}

interface Game {
  game_date: string
  game_pk: number
  pitch_count: number
}

type ViewMode = 'game' | 'inning' | 'atbat' | 'pxp'

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: 'game', label: 'Whole Game' },
  { id: 'inning', label: 'By Inning' },
  { id: 'atbat', label: 'By At-Bat' },
  { id: 'pxp', label: 'Pitch-by-Pitch' },
]

function App() {
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [pitcherName, setPitcherName] = useState<string>('')
  const [loadingStage, setLoadingStage] = useState<LoadingStage>(null)
  const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null)
  const [gameDates, setGameDates] = useState<Map<string, number>>(new Map())
  const [selectedGameDate, setSelectedGameDate] = useState<Date | undefined>(undefined)

  const isBusy = loadingStage !== null

  const [viewMode, setViewMode] = useState<ViewMode>('game')
  const [selectedInningKey, setSelectedInningKey] = useState<string | null>(null)
  const [selectedAtBat, setSelectedAtBat] = useState<number | null>(null)
  const [pxpIndex, setPxpIndex] = useState(0)
  const [pxpFullTrail, setPxpFullTrail] = useState(false)

  const sortedPitches = useMemo(() => sortPitches(pitches), [pitches])
  const inningGroups = useMemo(() => groupByInning(sortedPitches), [sortedPitches])
  const atBatGroups = useMemo(() => groupByAtBat(sortedPitches), [sortedPitches])

  useEffect(() => {
    setSelectedInningKey(inningGroups[0]?.key ?? null)
    setSelectedAtBat(atBatGroups[0]?.atBatNumber ?? null)
    setPxpIndex(0)
    setPxpFullTrail(false)
  }, [sortedPitches, inningGroups, atBatGroups])

  const fetchPitchesForDate = async (id: number, dateStr: string) => {
    setLoadingStage('pitches')
    try {
      const res = await fetch(`${API}/pitches/${id}?start=${dateStr}&end=${dateStr}`)
      if (!res.ok) throw new Error('Pitches fetch failed')
      const pitchData: Pitch[] = await res.json()
      setPitches(pitchData)
    } catch {
      setPitches([])
    } finally {
      setLoadingStage(null)
    }
  }

  const handleSearch = async () => {
    const name = pitcherName.trim()
    if (!name || isBusy) return

    setPitches([])
    setGameDates(new Map())
    setSelectedGameDate(undefined)
    setSelectedPitcherId(null)
    setLoadingStage('player')
    let pitchFetchStarted = false
    try {
      const searchRes = await fetch(
        `${API}/players/search?name=${encodeURIComponent(name)}`
      )
      if (!searchRes.ok) throw new Error('Player search failed')
      const players: { key_mlbam?: number }[] = await searchRes.json()
      const id = players?.[0]?.key_mlbam
      if (id == null) return

      setSelectedPitcherId(id)

      setLoadingStage('games')
      const gamesRes = await fetch(`${API}/games/${id}`)
      if (!gamesRes.ok) throw new Error('Games fetch failed')
      const games: Game[] = await gamesRes.json()

      const map = new Map<string, number>()
      for (const g of games) map.set(g.game_date, g.game_pk)
      setGameDates(map)

      if (games.length > 0) {
        const mostRecent = games[0].game_date
        setSelectedGameDate(parseISO(mostRecent))
        pitchFetchStarted = true
        await fetchPitchesForDate(id, mostRecent)
      }
    } catch {
      setPitches([])
    } finally {
      if (!pitchFetchStarted) setLoadingStage(null)
    }
  }

  const handlePitcherNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPitcherName(e.target.value)
  }

  const hasGame = (d: Date) => gameDates.has(format(d, 'yyyy-MM-dd'))

  const defaultMonth = useMemo(() => {
    if (selectedGameDate) return selectedGameDate
    const first = gameDates.keys().next().value
    return first ? parseISO(first) : undefined
  }, [gameDates, selectedGameDate])

  const triggerLabel = selectedGameDate
    ? format(selectedGameDate, 'MMM d, yyyy')
    : 'Select Date'

  const triggerDisabled = loadingStage === 'games' || selectedPitcherId == null

  const currentInning = inningGroups.find((g) => g.key === selectedInningKey) ?? null
  const currentAtBat = atBatGroups.find((g) => g.atBatNumber === selectedAtBat) ?? null
  const currentPxpPitch = sortedPitches[pxpIndex]

  const zoneProps = useMemo(() => {
    if (viewMode === 'inning') {
      return { pitches: currentInning?.pitches ?? [] }
    }
    if (viewMode === 'atbat') {
      return { pitches: currentAtBat?.pitches ?? [] }
    }
    if (viewMode === 'pxp' && currentPxpPitch) {
      const trail = pxpFullTrail
        ? sortedPitches.slice(0, pxpIndex)
        : sortedPitches
            .slice(0, pxpIndex)
            .filter((p) => p.at_bat_number === currentPxpPitch.at_bat_number)
      return {
        pitches: [] as Pitch[],
        trailPitches: trail,
        highlightPitch: currentPxpPitch,
      }
    }
    return { pitches: sortedPitches }
  }, [viewMode, currentInning, currentAtBat, currentPxpPitch, sortedPitches, pxpIndex, pxpFullTrail])

  const arsenalPitches = useMemo<Pitch[]>(() => {
    if (viewMode === 'inning') return currentInning?.pitches ?? []
    if (viewMode === 'atbat') return currentAtBat?.pitches ?? []
    return sortedPitches
  }, [viewMode, currentInning, currentAtBat, sortedPitches])

  const arsenalTitle =
    viewMode === 'inning'
      ? `Arsenal — ${currentInning?.topbot ?? ''} ${currentInning?.inning ?? ''}`
      : viewMode === 'atbat'
        ? `Arsenal — vs ${currentAtBat?.batterName || 'batter'}`
        : 'Arsenal'

  return (
    <div className="flex min-h-screen min-w-full flex-col bg-gray-900 text-white">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex flex-row items-start gap-8">
          <div className="inline-flex shrink-0 flex-col items-stretch gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-gray-900 px-2 py-1.5">
              <Input
                type="text"
                value={pitcherName}
                onChange={handlePitcherNameChange}
                placeholder="Search for a pitcher"
                className="min-w-0 flex-1 border-white/20 bg-transparent "
              />
              <Button
                variant="default"
                type="button"
                onClick={handleSearch}
                disabled={isBusy || !pitcherName.trim()}
                aria-busy={isBusy}
                aria-label={isBusy ? 'Searching' : 'Search'}
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={triggerDisabled}>
                  {triggerLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto border-white/15 bg-gray-950 p-3 text-gray-100 shadow-xl">
                <Calendar
                  mode="single"
                  selected={selectedGameDate}
                  onSelect={(d) => {
                    if (!d || !selectedPitcherId) return
                    const key = format(d, 'yyyy-MM-dd')
                    if (!gameDates.has(key)) return
                    setSelectedGameDate(d)
                    fetchPitchesForDate(selectedPitcherId, key)
                  }}
                  defaultMonth={defaultMonth}
                  modifiers={{ hasGame }}
                  modifiersClassNames={{
                    hasGame:
                      "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-emerald-400 after:content-['']",
                  }}
                  disabled={(d) => !hasGame(d)}
                  className="rounded-md bg-transparent p-0 text-gray-100"
                />
              </PopoverContent>
            </Popover>

            <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 p-1">
              {VIEW_MODES.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  size="sm"
                  variant={viewMode === m.id ? 'secondary' : 'ghost'}
                  onClick={() => setViewMode(m.id)}
                  disabled={sortedPitches.length === 0}
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {viewMode === 'inning' && inningGroups.length > 0 && (
              <select
                value={selectedInningKey ?? ''}
                onChange={(e) => setSelectedInningKey(e.target.value)}
                className="rounded-md border border-white/15 bg-gray-950 px-2 py-1.5 text-sm text-gray-100"
              >
                {inningGroups.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.topbot} {g.inning} ({g.pitches.length} pitches)
                  </option>
                ))}
              </select>
            )}

            {viewMode === 'atbat' && atBatGroups.length > 0 && (
              <select
                value={selectedAtBat ?? ''}
                onChange={(e) => setSelectedAtBat(Number(e.target.value))}
                className="rounded-md border border-white/15 bg-gray-950 px-2 py-1.5 text-sm text-gray-100"
              >
                {atBatGroups.map((ab) => {
                  const result = ab.result
                    ? ` — ${ab.result.replace(/_/g, ' ')}`
                    : ''
                  return (
                    <option key={ab.atBatNumber} value={ab.atBatNumber}>
                      {ab.topbot[0]}
                      {ab.inning} · {ab.batterName || `#${ab.batter}`}
                      {result}
                    </option>
                  )
                })}
              </select>
            )}

            <h2 className="text-lg font-bold">Pitches for {pitcherName}</h2>

            <div className="relative rounded-lg border border-white/15 p-2">
              <StrikeZone {...zoneProps} />
              {loadingStage ? (
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-gray-950/65 backdrop-blur-[2px]"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-10 animate-spin text-white/85" aria-hidden />
                  <span className="text-sm text-white/75">{LOADING_LABELS[loadingStage]}</span>
                  {loadingStage === 'games' && (
                    <span className="text-xs text-white/50">May take a minute</span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex w-72 flex-col gap-4">
            <PitchLegend />
            {arsenalPitches.length > 0 && (
              <PitchArsenal pitches={arsenalPitches} title={arsenalTitle} />
            )}
            {viewMode === 'pxp' && sortedPitches.length > 0 && (
              <PitchByPitch
                pitches={sortedPitches}
                index={pxpIndex}
                onIndexChange={setPxpIndex}
                fullTrail={pxpFullTrail}
                onFullTrailChange={setPxpFullTrail}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
