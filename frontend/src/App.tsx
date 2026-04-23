import { useEffect, useState } from 'react'
import StrikeZone from './components/StrikeZone'
import PitchLegend from './components/PitchLegend'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'

interface Pitch {
  pitch_type: string
  plate_x: number
  plate_z: number
  description: string
  release_speed: number
  release_spin_rate: number
  sz_top: number
  sz_bot: number
}

function App() {
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [pitcherName, setPitcherName] = useState<string>('')

  // useEffect(() => {
  //   fetch('http://localhost:8000/pitches/660271?start=2023-06-01&end=2023-06-30')
  //     .then(res => res.json())
  //     .then(data => setPitches(data))
  // }, [pitcherName])

  const handleSearch = async () => {
    console.log(pitcherName)
    const res = await fetch(`http://localhost:8000/players/search?name=${pitcherName}`)
    const data = await res.json()
    fetch(`http://localhost:8000/pitches/${data[0].key_mlbam}?start=2023-06-01&end=2023-06-30`)
      .then(res => res.json())
      .then(data => setPitches(data))
  }

  const handlePitcherNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPitcherName(e.target.value)
  }

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
              <Button variant="default" type="button" onClick={handleSearch}>
                Search
              </Button>
            </div>
            <h2 className="text-lg font-bold">Pitches for {pitcherName}</h2>

            <div className="rounded-lg border border-white/15 p-2">
              <StrikeZone pitches={pitches} />
            </div>
          </div>
          <PitchLegend />
        </div>
      </main>
    </div>
  )
}

export default App