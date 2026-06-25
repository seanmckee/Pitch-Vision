import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Pitch {
  plate_x: number
  plate_z: number
  pitch_type: string
  pitch_name?: string
  description: string
  release_speed?: number
  release_spin_rate?: number
  spin_axis?: number
  pfx_x?: number
  pfx_z?: number
  batter_name?: string
  stand?: string
  inning?: number
  inning_topbot?: string
  balls?: number
  strikes?: number
  events?: string
  launch_speed?: number
  launch_angle?: number
  hit_distance_sc?: number
}

interface StrikeZoneProps {
  pitches: Pitch[]
  trailPitches?: Pitch[]
  highlightPitch?: Pitch | null
}

// color map for pitch descriptions
const colorMap: Record<string, string> = {
  called_strike: '#ef4444',
  ball: '#3b82f6',
  swinging_strike: '#f97316',
  hit_into_play: '#22c55e',
  foul: '#a855f7',
}

// color for pitch based on description
const colorFor = (d: Pitch) => colorMap[d.description] || '#94a3b8'

// format description for tooltip
const formatDescription = (d: string) =>
  d ? d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : ''

const tooltipFor = (d: Pitch) => {
  const lines: string[] = []
  const headerLeft = d.pitch_name || d.pitch_type || 'Pitch'
  const headerRight = d.release_speed ? `${d.release_speed.toFixed(1)} mph` : ''
  lines.push(headerRight ? `${headerLeft} · ${headerRight}` : headerLeft)
  if (d.inning_topbot && d.inning) lines.push(`${d.inning_topbot} ${d.inning}`)
  if (d.balls != null && d.strikes != null) {
    const batter = d.batter_name ? ` · ${d.batter_name}${d.stand ? ` (${d.stand})` : ''}` : ''
    lines.push(`${d.balls}-${d.strikes}${batter}`)
  } else if (d.batter_name) {
    lines.push(`${d.batter_name}${d.stand ? ` (${d.stand})` : ''}`)
  }
  if (d.release_spin_rate) lines.push(`${Math.round(d.release_spin_rate)} rpm${d.spin_axis ? ` @ ${Math.round(d.spin_axis)}°` : ''}`)
  if (d.pfx_x != null && d.pfx_z != null && (d.pfx_x !== 0 || d.pfx_z !== 0)) {
    lines.push(`${(d.pfx_x * 12).toFixed(1)}" H / ${(d.pfx_z * 12).toFixed(1)}" V`)
  }
  if (d.description) lines.push(formatDescription(d.description))
  const isContact = d.description === 'hit_into_play' || (d.launch_speed ?? 0) > 0 || (d.launch_angle ?? 0) !== 0
  if (isContact) {
    if (d.events && d.events !== '0') lines.push(formatDescription(d.events))
    const exit = d.launch_speed ? `${d.launch_speed.toFixed(1)} mph` : '—'
    const la = d.launch_angle ? `${d.launch_angle.toFixed(0)}°` : '—'
    const dist = d.hit_distance_sc ? ` · ${Math.round(d.hit_distance_sc)} ft` : ''
    lines.push(`Exit ${exit} · ${la}${dist}`)
  }
  return lines.join('\n')
}

const StrikeZone = ({ pitches, trailPitches, highlightPitch }: StrikeZoneProps) => {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const width = 350
    const height = 400
    const margin = { top: 30, right: 30, bottom: 30, left: 30 }

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    const xScale = d3.scaleLinear()
      .domain([-2, 2])
      .range([margin.left, width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0.5, 4.5])
      .range([height - margin.bottom, margin.top])

    svg.append('rect')
      .attr('x', xScale(-0.83))
      .attr('y', yScale(3.5))
      .attr('width', xScale(0.83) - xScale(-0.83))
      .attr('height', yScale(1.5) - yScale(3.5))
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)

    const zoneThird = (0.83 * 2) / 3
    for (let i = 1; i <= 2; i++) {
      svg.append('line')
        .attr('x1', xScale(-0.83 + zoneThird * i))
        .attr('y1', yScale(3.5))
        .attr('x2', xScale(-0.83 + zoneThird * i))
        .attr('y2', yScale(1.5))
        .attr('stroke', '#444')
        .attr('stroke-width', 1)
    }
    const zoneHeightThird = (3.5 - 1.5) / 3
    for (let i = 1; i <= 2; i++) {
      svg.append('line')
        .attr('x1', xScale(-0.83))
        .attr('y1', yScale(1.5 + zoneHeightThird * i))
        .attr('x2', xScale(0.83))
        .attr('y2', yScale(1.5 + zoneHeightThird * i))
        .attr('stroke', '#444')
        .attr('stroke-width', 1)
    }

    const drawDot = (
      sel: d3.Selection<SVGGElement, unknown, null, undefined>,
      data: Pitch[],
      opts: { className: string; r: number; opacity: number; stroke?: string; strokeWidth?: number },
    ) => {
      const join = sel
        .selectAll<SVGCircleElement, Pitch>(`circle.${opts.className}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', opts.className)
        .attr('cx', d => xScale(d.plate_x))
        .attr('cy', d => yScale(d.plate_z))
        .attr('r', opts.r)
        .attr('fill', d => colorFor(d))
        .attr('opacity', opts.opacity)
      if (opts.stroke) join.attr('stroke', opts.stroke).attr('stroke-width', opts.strokeWidth ?? 1)
      join.append('title').text(d => tooltipFor(d))
      return join
    }

    if (trailPitches && trailPitches.length) {
      drawDot(svg.append('g'), trailPitches, { className: 'trail', r: 5, opacity: 0.25 })
    }

    drawDot(svg.append('g'), pitches, { className: 'pitch', r: 8, opacity: 0.8 })

    if (highlightPitch) {
      const g = svg.append('g')
      drawDot(g, [highlightPitch], {
        className: 'highlight',
        r: 10,
        opacity: 1,
        stroke: '#fff',
        strokeWidth: 2.5,
      })
    }

  }, [pitches, trailPitches, highlightPitch])

  return <svg ref={svgRef} />
}

export default StrikeZone
