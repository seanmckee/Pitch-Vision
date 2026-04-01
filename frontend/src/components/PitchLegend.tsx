const items = [
  { label: 'Called Strike', color: '#ef4444' }, // red
  { label: 'Swinging Strike', color: '#f97316' }, // orange
  { label: 'Ball', color: '#3b82f6' }, // blue
  { label: 'Hit Into Play', color: '#22c55e' }, // green
  { label: 'Foul', color: '#a855f7' }, // purple
]

const PitchLegend = () => {
  return (
    <div className="flex flex-col gap-2">
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-gray-300">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default PitchLegend
