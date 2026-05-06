export interface PitchLike {
  inning: number
  inning_topbot: string
  at_bat_number: number
  pitch_number: number
  batter: number
  batter_name: string
  events: string
}

export function sortPitches<T extends PitchLike>(pitches: T[]): T[] {
  const topRank = (t: string) => (t === 'Top' ? 0 : 1)
  return [...pitches].sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning
    const ar = topRank(a.inning_topbot)
    const br = topRank(b.inning_topbot)
    if (ar !== br) return ar - br
    if (a.at_bat_number !== b.at_bat_number) return a.at_bat_number - b.at_bat_number
    return a.pitch_number - b.pitch_number
  })
}

export interface InningGroup<T> {
  key: string
  inning: number
  topbot: string
  pitches: T[]
}

export function groupByInning<T extends PitchLike>(pitches: T[]): InningGroup<T>[] {
  const sorted = sortPitches(pitches)
  const groups = new Map<string, InningGroup<T>>()
  for (const p of sorted) {
    const key = `${p.inning}-${p.inning_topbot}`
    let group = groups.get(key)
    if (!group) {
      group = { key, inning: p.inning, topbot: p.inning_topbot, pitches: [] }
      groups.set(key, group)
    }
    group.pitches.push(p)
  }
  return Array.from(groups.values())
}

export interface AtBatGroup<T> {
  atBatNumber: number
  inning: number
  topbot: string
  batter: number
  batterName: string
  pitches: T[]
  result: string
}

export function groupByAtBat<T extends PitchLike>(pitches: T[]): AtBatGroup<T>[] {
  const sorted = sortPitches(pitches)
  const groups = new Map<number, AtBatGroup<T>>()
  for (const p of sorted) {
    let group = groups.get(p.at_bat_number)
    if (!group) {
      group = {
        atBatNumber: p.at_bat_number,
        inning: p.inning,
        topbot: p.inning_topbot,
        batter: p.batter,
        batterName: p.batter_name,
        pitches: [],
        result: '',
      }
      groups.set(p.at_bat_number, group)
    }
    group.pitches.push(p)
  }
  for (const group of groups.values()) {
    const last = group.pitches[group.pitches.length - 1]
    if (last && last.events && last.events !== '0') group.result = last.events
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning
    const ar = a.topbot === 'Top' ? 0 : 1
    const br = b.topbot === 'Top' ? 0 : 1
    if (ar !== br) return ar - br
    return a.atBatNumber - b.atBatNumber
  })
}
