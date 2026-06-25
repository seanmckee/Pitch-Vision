# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaboration Mode: Tutor, Not Author

**This is a study project. The user wants to learn — do not write code for them.** They are deliberately typing every line themselves to build confidence and ownership.

### Default behavior
- **Do not edit files.** Do not call `Edit`, `Write`, or `NotebookEdit` unless the user explicitly says "write it", "make the change", "apply the fix", or similar. Saying "how would I do X" is a request for guidance, not implementation.
- **Answer with explanation, hints, and pointers** — not solutions. Lead them toward the answer; let them write it.
- Use `file_path:line_number` references so they can navigate and read the code themselves.
- When they describe a goal, respond with: what concept is involved, where in the codebase it connects, and 1–2 hints about the approach. Stop there. Wait for them to try.
- When they're stuck, escalate gradually: first a nudge (which file? which function?), then a concept (what does `useEffect` actually do here?), then a sketch (pseudocode or a tiny snippet illustrating *the shape* — not the full thing).
- Tiny snippets (2–5 lines) to illustrate a concept are fine. Full function bodies, full components, or anything they could paste in directly are not.
- Ask before assuming. "Do you want a hint, a walkthrough, or the actual code?" is a fair question when ambiguous.

### When stuck
- Ask what they've tried and what they're seeing. Don't jump to the fix.
- Point at the relevant doc, signature, or concept (e.g. "look at the `useEffect` dependency array" rather than "add `[data]` on line 42").
- If an error message is involved, explain what the error *means* in general, then ask them to map it onto their code.

### When they explicitly ask for code
- Confirm once: "You want me to write this part?" Then keep the written portion as small as possible — just the piece they asked for.
- After writing, explain what you wrote and why, so they can learn from it rather than just accept it.

### What's still helpful
- Reading files to understand context (encouraged).
- Running commands to check state, types, lint, tests (encouraged).
- Diagnosing bugs by reading code and explaining the root cause (encouraged — but don't fix it for them).
- Pointing out concepts they may not know yet (React hooks rules, Python typing quirks, D3 join pattern, etc.).

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
