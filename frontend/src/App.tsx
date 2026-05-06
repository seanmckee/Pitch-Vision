import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import StrikeZone from './components/StrikeZone'
import PitchLegend from './components/PitchLegend'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Calendar } from './components/ui/calendar'
import {Popover, PopoverContent, PopoverTrigger} from './components/ui/popover'

const API = 'http://localhost:8000'

interface Pitch {
  pitch_type: string
  plate_x: number
  plate_z: number
  description: string
  release_speed: number
  release_spin_rate: number
  sz_top: number
  sz_bot: number
  game_pk: number
  game_date: string
  inning_topbot: string
  inning: number
  at_bat_number: number
  pitch_number: number
}

interface Game {
  game_date: string
  game_pk: number
  pitch_count: number
}

function App() {
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [pitcherName, setPitcherName] = useState<string>('')
  const [isLoadingPitches, setIsLoadingPitches] = useState(false)
  const [selectedPitcherId, setSelectedPitcherId] = useState<number | null>(null)
  const [gameDates, setGameDates] = useState<Map<string, number>>(new Map())
  const [selectedGameDate, setSelectedGameDate] = useState<Date | undefined>(undefined)
  const [isLoadingGames, setIsLoadingGames] = useState(false)

  const fetchPitchesForDate = async (id: number, dateStr: string) => {
    setIsLoadingPitches(true)
    try {
      const res = await fetch(`${API}/pitches/${id}?start=${dateStr}&end=${dateStr}`)
      if (!res.ok) throw new Error('Pitches fetch failed')
      const pitchData: Pitch[] = await res.json()
      setPitches(pitchData)
    } catch {
      setPitches([])
    } finally {
      setIsLoadingPitches(false)
    }
  }

  const handleSearch = async () => {
    const name = pitcherName.trim()
    if (!name || isLoadingGames || isLoadingPitches) return

    setIsLoadingGames(true)
    setPitches([])
    setGameDates(new Map())
    setSelectedGameDate(undefined)
    setSelectedPitcherId(null)

    try {
      const searchRes = await fetch(
        `${API}/players/search?name=${encodeURIComponent(name)}`
      )
      if (!searchRes.ok) throw new Error('Player search failed')
      const players: { key_mlbam?: number }[] = await searchRes.json()
      const id = players?.[0]?.key_mlbam
      if (id == null) return

      setSelectedPitcherId(id)

      const gamesRes = await fetch(`${API}/games/${id}`)
      if (!gamesRes.ok) throw new Error('Games fetch failed')
      const games: Game[] = await gamesRes.json()

      const map = new Map<string, number>()
      for (const g of games) map.set(g.game_date, g.game_pk)
      setGameDates(map)

      if (games.length > 0) {
        const mostRecent = games[0].game_date
        setSelectedGameDate(parseISO(mostRecent))
        await fetchPitchesForDate(id, mostRecent)
      }
    } catch {
      setPitches([])
    } finally {
      setIsLoadingGames(false)
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

  const triggerLabel = isLoadingGames
    ? 'Loading games…'
    : selectedGameDate
      ? format(selectedGameDate, 'MMM d, yyyy')
      : 'Select Date'

  const triggerDisabled = isLoadingGames || selectedPitcherId == null

  return (
    <div className="flex min-h-screen min-w-full flex-col bg-gray-900 text-white">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex flex-row items-center gap-8">
          <div className="inline-flex shrink-0 flex-col items-stretch gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-gray-900 px-2 py-1.5">
              <Input
                type="text"
                value={pitcherName}
                onChange={handlePitcherNameChange}
                placeholder="Search for a pitcher"
                className="min-w-0 flex-1 border-white/20 bg-transparent"
              />
              <Button
                variant="default"
                type="button"
                onClick={handleSearch}
                disabled={isLoadingGames || isLoadingPitches || !pitcherName.trim()}
                aria-busy={isLoadingGames || isLoadingPitches}
              >
                {isLoadingGames || isLoadingPitches ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Loading
                  </>
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
            <h2 className="text-lg font-bold">Pitches for {pitcherName}</h2>

            <div className="relative rounded-lg border border-white/15 p-2">
              <StrikeZone pitches={pitches} />
              {isLoadingPitches ? (
                <div
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-gray-950/65 backdrop-blur-[2px]"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-10 animate-spin text-white/85" aria-hidden />
                  <span className="text-sm text-white/75">Loading pitches…</span>
                </div>
              ) : null}
            </div>
          </div>
          <PitchLegend />
        </div>
      </main>
    </div>
  )
}

export default App
