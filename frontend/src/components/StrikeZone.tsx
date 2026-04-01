import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Pitch {
  plate_x: number
  plate_z: number
  pitch_type: string
  description: string
}

interface StrikeZoneProps {
  pitches: Pitch[]
}

const StrikeZone = ({ pitches }: StrikeZoneProps) => {
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

    // Regulation strike zone: 17 inches wide (±0.83 ft), ~1.5–3.5 ft high
    // Show roughly 1 ball-width of padding outside the zone (~1.5 ft each side)
    const xScale = d3.scaleLinear()
      .domain([-2, 2])
      .range([margin.left, width - margin.right])

    const yScale = d3.scaleLinear()
      .domain([0.5, 4.5])
      .range([height - margin.bottom, margin.top])

    // Strike zone
    svg.append('rect')
      .attr('x', xScale(-0.83))
      .attr('y', yScale(3.5))
      .attr('width', xScale(0.83) - xScale(-0.83))
      .attr('height', yScale(1.5) - yScale(3.5))
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)

    // Inner grid lines (3x3)
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

    // Pitch dots
    const colorMap: Record<string, string> = {
      'called_strike': '#ef4444',
      'ball': '#3b82f6',
      'swinging_strike': '#f97316',
      'hit_into_play': '#22c55e',
      'foul': '#a855f7',
    }

    svg.selectAll('circle')
      .data(pitches)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.plate_x))
      .attr('cy', d => yScale(d.plate_z))
      .attr('r', 8)
      .attr('fill', d => colorMap[d.description] || '#94a3b8')
      .attr('opacity', 0.8)

  }, [pitches])

  return <svg ref={svgRef} />
}

export default StrikeZone