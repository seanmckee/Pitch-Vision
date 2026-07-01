# Pitch Vision

Search a pitcher, pick a start from the last year, and explore every pitch from that game — location on a strike zone, arsenal breakdown, and a pitch-by-pitch walkthrough.

Side project I built to get more comfortable with React, D3, and FastAPI while working with real Statcast data.

## What it does

- Look up a pitcher by name (pulls from Baseball Savant via [pybaseball](https://github.com/jldbc/pybaseball))
- Calendar of their game dates from the past 365 days
- Strike zone chart — dots colored by outcome (called strike, ball, foul, etc.)
- Filter by whole game, half-inning, or at-bat
- Pitch-by-pitch mode with keyboard arrows and an at-bat timeline
- Arsenal panel — usage %, velocity, spin, movement by pitch type

First load for a pitcher can take a few seconds. Statcast isn't cached anywhere yet; every search hits Savant live.

## Stack

**Frontend:** React, TypeScript, Vite, Tailwind, D3, shadcn/ui  
**Backend:** FastAPI, pandas, pybaseball

## Run locally

You'll need two terminals.

**Backend** (from `backend/`):

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at `http://localhost:8000`.

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. By default the frontend talks to `http://localhost:8000`.

Optional: copy `frontend/.env.example` → `frontend/.env.local` if you need a custom API URL locally.

Try searching something like `Shohei Ohtani` or `Gerrit Cole`.

## Deploy

**Backend (Render):** [pitch-vision.onrender.com](https://pitch-vision.onrender.com)

**Frontend (Vercel):** connect the repo, set root directory to `frontend`.

| Where | Variable | Value |
|-------|----------|-------|
| Vercel | `VITE_API_URL` | `https://pitch-vision.onrender.com` |
| Render | `ALLOWED_ORIGINS` | `http://localhost:5173,https://YOUR-APP.vercel.app` |

After Vercel gives you a URL, add it to `ALLOWED_ORIGINS` on Render and redeploy the backend.

**Flow:** push to `main` → Vercel rebuilds frontend, Render rebuilds backend. Local dev unchanged (localhost defaults).

## Repo layout

```
backend/main.py          FastAPI — player search, games list, pitch data
frontend/src/App.tsx     Page state, search flow, view modes
frontend/src/components/ StrikeZone (D3), PitchByPitch, PitchArsenal
frontend/src/lib/        pitchGroups.ts — sort/group pitches by inning & at-bat
```

## API

| Endpoint                                | Purpose                               |
| --------------------------------------- | ------------------------------------- |
| `GET /players/search?name=`             | Fuzzy name lookup → MLBAM id          |
| `GET /games/{pitcher_id}`               | Game dates + pitch counts (last year) |
| `GET /pitches/{pitcher_id}?start=&end=` | Pitch records for a date range        |

## Still on the list

- XGBoost pitch-type model + predicted vs actual in the UI
- Deploy frontend + backend
- A few unit tests (`pitchGroups`, API helpers)
- Statcast caching so repeat searches aren't slow

## Notes

- Statcast coordinates: `plate_x` / `plate_z` are feet from the catcher's perspective. The zone box is the standard ±0.83 ft wide, 1.5–3.5 ft tall.
- D3 draws inside a React-owned `<svg>`. React handles everything else.
- Batter names come from a bulk ID lookup after pitches are fetched — not in the raw Statcast export.
