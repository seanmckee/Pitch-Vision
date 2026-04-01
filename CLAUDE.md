# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pitch Vision is a baseball pitch analytics web app. It visualizes Statcast pitch data with D3, predicts pitch types/outcomes with XGBoost, and answers natural language queries via a LangGraph agent.

## Development Commands

### Frontend (from `frontend/`)
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck with `tsc -b` then build with Vite
- `npm run lint` — ESLint across all TS/TSX files
- `npm run preview` — preview production build
- `npx shadcn@latest add <component>` — add shadcn/ui components

### Backend (from `backend/`)
- Not yet scaffolded. Will be FastAPI (Python).

## Architecture

### Frontend
- React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- Path alias: `@/` maps to `frontend/src/`
- shadcn/ui style: `radix-nova`, no RSC, CSS variables enabled, Lucide icons
- D3 visualizations render into `useRef<SVGSVGElement>` via `useEffect` — D3 owns the DOM inside the SVG, React owns everything outside. Clear previous render with `selectAll('*').remove()` before drawing.
- Statcast coordinate system: `plate_x` is horizontal (-2.5 to 2.5 ft), `plate_z` is vertical (0 to 5 ft). Strike zone box is roughly x: ±0.83 ft, z: 1.5–3.5 ft.

### Planned Backend
- FastAPI with RESTful endpoints
- pybaseball for Statcast data ingestion
- XGBoost + scikit-learn models saved in `models/`
- LangGraph agent for natural language pitch queries

## Conventions

- TypeScript strict mode
- Tailwind for all styling — no CSS modules or styled-components
- D3 never touches React state directly; data flows in via props, D3 reads it in useEffect
- Components should be small and focused
- Frontend ESLint config: recommended TS rules + react-hooks + react-refresh
