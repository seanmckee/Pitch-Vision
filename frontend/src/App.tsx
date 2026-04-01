import { useEffect, useState } from 'react'
import StrikeZone from './components/StrikeZone'
import PitchLegend from './components/PitchLegend'

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

  useEffect(() => {
    fetch('http://localhost:8000/pitches/660271?start=2023-06-01&end=2023-06-30')
      .then(res => res.json())
      .then(data => setPitches(data))
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center gap-8">
      <StrikeZone pitches={pitches} />
      <PitchLegend />
    </div>
  )
}

export default App