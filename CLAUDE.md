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
- `source venv/bin/activate` — activate the Python virtualenv
- `uvicorn main:app --reload` — start FastAPI dev server on `http://localhost:8000` (matches the CORS allow-list and the URL hardcoded in `frontend/src/App.tsx`)

## Architecture

### Frontend
- React 19 + TypeScript + Vite 8 + Tailwind CSS v4
- Path alias: `@/` maps to `frontend/src/`
- shadcn/ui style: `radix-nova`, no RSC, CSS variables enabled, Lucide icons
- D3 visualizations render into `useRef<SVGSVGElement>` via `useEffect` — D3 owns the DOM inside the SVG, React owns everything outside. Clear previous render with `selectAll('*').remove()` before drawing.
- Statcast coordinate system: `plate_x` is horizontal (-2.5 to 2.5 ft), `plate_z` is vertical (0 to 5 ft). Strike zone box is roughly x: ±0.83 ft, z: 1.5–3.5 ft.

### Backend
- FastAPI app in `backend/main.py`, CORS locked to `http://localhost:5173` (Vite dev origin)
- Statcast data is fetched on-demand via `pybaseball` (`statcast_pitcher`, `playerid_lookup`) — there is no DB or cache, so endpoints can be slow on first hit
- Endpoints currently shipped:
  - `GET /players/search?name=<query>` — fuzzy lookup, returns `{name_first, name_last, key_mlbam}` rows
  - `GET /pitches/{pitcher_id}?start=<YYYY-MM-DD>&end=<YYYY-MM-DD>` — trimmed pitch records (drops rows missing `plate_x`/`plate_z`, fills remaining NaNs with 0)
  - `GET /games/{pitcher_id}` — last 365 days of pitches for the pitcher
- Frontend → backend flow: search by name → take `players[0].key_mlbam` → fetch `/pitches/{id}` for a date range → render in `StrikeZone`
- XGBoost + scikit-learn models will be saved in `models/` (empty for now); LangGraph NL query agent is planned but not built

## Conventions

- TypeScript strict mode
- Tailwind for all styling — no CSS modules or styled-components
- D3 never touches React state directly; data flows in via props, D3 reads it in useEffect
- Components should be small and focused
- Frontend ESLint config: recommended TS rules + react-hooks + react-refresh
