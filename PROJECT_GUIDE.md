# Pitch Vision — Project Guide

A walkthrough of every file in the repo, what it does, and how the pieces fit together. Read top-to-bottom — files are ordered the way you'd want to encounter them while learning the codebase.

---

## Repo layout

```
pitch-vision/
├── CLAUDE.md             # AI assistant instructions / project overview
├── PROJECT_GUIDE.md      # ← you are here
├── .gitignore
├── backend/              # FastAPI + pybaseball Python server
│   └── main.py
├── frontend/             # React + Vite + D3 client
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig*.json
│   ├── eslint.config.js
│   ├── components.json   # shadcn/ui config
│   ├── public/           # static assets served as-is
│   └── src/
│       ├── main.tsx          # React entry
│       ├── App.tsx           # top-level page + state
│       ├── index.css         # Tailwind imports
│       ├── assets/           # bundled images
│       ├── lib/
│       │   ├── utils.ts      # `cn()` className helper
│       │   └── pitchGroups.ts# sort/group pitch arrays
│       └── components/
│           ├── StrikeZone.tsx    # D3 visualization
│           ├── PitchByPitch.tsx  # PxP nav panel
│           ├── PitchArsenal.tsx  # arsenal summary
│           ├── PitchLegend.tsx   # color legend
│           └── ui/               # shadcn primitives
├── models/               # (empty — for trained XGBoost artifacts)
└── notebooks/            # (empty — for exploratory analysis)
```

---

## Big-picture data flow

```
User types pitcher name
        │
        ▼
[App.tsx handleSearch]
        │
        │ GET /players/search?name=…
        ▼
[backend/main.py: search_players]
        │ pybaseball.playerid_lookup → MLBAM key
        │
        ▼ key_mlbam
[App.tsx]
        │ GET /games/{id}
        ▼
[backend/main.py: get_games]
        │ pybaseball.statcast_pitcher (last 365 days)
        │ group by game_date → pitch_count
        ▼ Game[]
[App.tsx Calendar shows dots on those dates]
        │ user picks date
        │ GET /pitches/{id}?start=YYYY-MM-DD&end=YYYY-MM-DD
        ▼
[backend/main.py: get_pitches]
        │ pybaseball.statcast_pitcher (one day)
        │ drop rows missing plate_x/plate_z, fillna(0)
        ▼ Pitch[]
[App.tsx state.pitches]
        │
        ├── sortPitches → chronological order
        ├── groupByInning  ─┐
        └── groupByAtBat   ─┤
                           ▼
              [StrikeZone, PitchByPitch, PitchArsenal]
```

Everything is fetched live on each user action — there is no cache or DB. First request for a pitcher's full season can take a few seconds.

---

## Reading order

### 1. `CLAUDE.md`
Project mission statement plus dev commands. Worth re-reading after you finish this guide.

### 2. `.gitignore` (root) and `frontend/.gitignore`
Standard exclusions. Root file ignores `node_modules/`, `dist/`, Python `__pycache__/`, `.venv/`, `.env*`, `*.joblib`/`*.pkl` (future model artifacts), and `.DS_Store`. Frontend file is the default Vite template's.

---

## Backend (Python · FastAPI · pybaseball)

### 3. `backend/main.py`
The entire server in one file (~50 lines).

**Setup**
- Creates a FastAPI app and adds a CORS middleware allowing only `http://localhost:5173` (the Vite dev origin). Tightening CORS is what lets your browser actually fetch from a different port during dev.
- Imports `statcast_pitcher` and `playerid_lookup` from `pybaseball`, which scrape data live from `baseballsavant.mlb.com`.

**Endpoints**

| Method/Path | What it does |
|---|---|
| `GET /` | Health-check returning `{"message": "Pitch Vision API"}` |
| `GET /players/search?name=<query>` | Splits the query into first/last, calls `playerid_lookup`, returns `[{name_first, name_last, key_mlbam}, ...]`. The frontend uses the first result's `key_mlbam`. |
| `GET /pitches/{pitcher_id}?start=YYYY-MM-DD&end=YYYY-MM-DD` | Calls `statcast_pitcher`, slices to 14 columns (`pitch_type`, `plate_x/z`, `description`, `release_speed`, `release_spin_rate`, `sz_top/bot`, `game_pk`, `game_date`, `inning_topbot`, `inning`, `at_bat_number`, `pitch_number`), drops rows missing pitch location, fills remaining NaNs with 0, returns JSON. |
| `GET /games/{pitcher_id}` | Calls `statcast_pitcher` for the last 365 days and returns the full dataframe as JSON. **Note:** the frontend expects this to be grouped per game with shape `{game_date, game_pk, pitch_count}` — the current implementation passes wrong kwarg names (`start=`/`end=`/`pitcher_id=` instead of `start_dt`/`end_dt`/`player_id`) and doesn't aggregate, so it will fail at runtime. Worth fixing first if you want to run the app. |

**Key concept — `pybaseball`:** an open-source Python package that scrapes Statcast CSV exports from Baseball Savant. Functions return pandas DataFrames; there are no auth tokens and no rate limit on your side, but Savant can be slow on first hit. There is no caching in the backend, so every request hits Savant.

---

## Frontend — config and entry

### 4. `frontend/index.html`
Standard Vite HTML shell. The whole React app gets mounted into `<div id="root">` by `main.tsx`.

### 5. `frontend/package.json`
Scripts and deps.
- `npm run dev` → Vite dev server (HMR) on port 5173
- `npm run build` → `tsc -b` typecheck, then Vite production build
- `npm run lint` → ESLint
- `npm run preview` → serves the built `dist/` for local preview
Notable deps: `react@19`, `vite@8`, `d3`, `date-fns`, `react-day-picker`, `radix-ui` (for popover/slot primitives shadcn wraps), `tailwindcss@4`, `lucide-react` (icons), `class-variance-authority`+`tailwind-merge`+`clsx` (which power the `cn()` helper).

### 6. `frontend/vite.config.ts`
Registers two plugins — React and Tailwind v4 (the new Vite-native plugin) — and sets the `@` path alias to `./src` so you can write `import x from '@/lib/utils'` instead of relative paths.

### 7. `frontend/tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
Vite's split-tsconfig pattern. `tsconfig.json` is a stub that references the other two. `tsconfig.app.json` is for `src/` (DOM lib, JSX, strict mode, `noUnusedLocals`, the `@/*` path alias). `tsconfig.node.json` is for `vite.config.ts` itself (Node types, no DOM lib).

### 8. `frontend/eslint.config.js`
Modern flat ESLint config. Ignores `dist/`. Applies recommended JS + TS rules plus the React Hooks rules and React Refresh rules (Vite HMR enforcement). Note: there is one known pre-existing warning in `src/components/ui/button.tsx` because shadcn re-exports both a component and a `buttonVariants` helper from the same file — non-blocking.

### 9. `frontend/components.json`
shadcn/ui configuration. Tells the `npx shadcn@latest add <component>` CLI where to drop new components (`@/components/ui`), what style to use (`radix-nova`), and which icon library (`lucide`). You typically only touch this if you're adding new shadcn primitives.

### 10. `frontend/src/main.tsx`
Three-line entry: mounts `<App />` inside `<StrictMode>` to the `#root` div.

### 11. `frontend/src/index.css`
Just four `@import` lines: Tailwind core, `tw-animate-css` (animation utilities), `shadcn/tailwind.css` (shadcn's design tokens — color variables, etc.), and the Geist variable font.

### 12. `frontend/src/assets/` (`hero.png`, `react.svg`, `vite.svg`)
Image assets shipped via Vite's static-import system. None are currently rendered by the app — leftovers from the Vite template.

### 13. `frontend/public/` (`favicon.svg`, `icons.svg`)
Files in `public/` are served verbatim at the root path. `favicon.svg` is referenced from `index.html`. `icons.svg` is a sprite sheet (unused right now).

---

## Frontend — shared libs

### 14. `frontend/src/lib/utils.ts`
Six lines. Exports `cn(...inputs)` which combines `clsx` (conditional class lists) with `tailwind-merge` (resolves conflicting Tailwind classes like `p-2` + `p-4`). Every shadcn component uses this. **Pattern to internalize:** when you need to merge a parent-provided `className` with your own, use `cn('default-classes', className)`.

### 15. `frontend/src/lib/pitchGroups.ts`
Pure data-shaping functions (no React, no D3). Three exports:
- **`sortPitches`** — chronological sort by `(inning, top-before-bot, at_bat_number, pitch_number)`. Statcast's natural ordering isn't reliably chronological, so this is the canonical timeline used everywhere else.
- **`groupByInning`** — buckets sorted pitches into half-innings, each `{ key, inning, topbot, pitches }`.
- **`groupByAtBat`** — buckets sorted pitches into plate appearances, each `{ atBatNumber, inning, topbot, batter, batterName, pitches, result }`. `result` comes from the `events` field on the last pitch of the AB (e.g. `"strikeout"`, `"single"`).
- **`PitchLike` interface** — minimum fields required for the above to work. Each component declares its own richer `Pitch` extending this via TypeScript generics.

---

## Frontend — feature components

### 16. `frontend/src/App.tsx`
The single page. Where state lives.

**State** (each a `useState`):
- `pitches: Pitch[]` — raw pitches from the latest fetch
- `pitcherName`, `selectedPitcherId`, `gameDates: Map<dateStr, game_pk>`, `selectedGameDate`
- `isLoadingPitches`, `isLoadingGames` — spinners
- `viewMode: 'game'|'inning'|'atbat'|'pxp'`
- `selectedInningKey`, `selectedAtBat`, `pxpIndex`, `pxpFullTrail` — per-mode selectors

**Derived data** (each a `useMemo`):
- `sortedPitches` ← `sortPitches(pitches)`
- `inningGroups` ← `groupByInning(sortedPitches)`
- `atBatGroups` ← `groupByAtBat(sortedPitches)`
- `zoneProps` — assembles the `{ pitches, trailPitches?, highlightPitch? }` payload for `<StrikeZone>` based on the active view mode
- `arsenalPitches`/`arsenalTitle` — which pitches feed the arsenal panel

**Side effects**:
- `useEffect` that resets per-mode selectors whenever the pitches array changes — picks the first inning/at-bat as default, resets PxP index to 0.

**User flow handlers**:
- `handleSearch` — fetches player → games → pitches for the most-recent game, all in sequence. Failures wipe state quietly via `catch { setPitches([]) }`.
- `fetchPitchesForDate` — invoked when the user picks a new date in the Calendar popover.

**Layout**:
- Left column: search input, Calendar popover, view-mode segmented buttons, secondary control (inning select / atbat select / nothing), strike-zone SVG inside a bordered card.
- Right column: `<PitchLegend>`, `<PitchArsenal>`, and `<PitchByPitch>` (only when `viewMode === 'pxp'`).

**Pitch type**: the `interface Pitch { … }` near the top is the contract with the backend. It lists ~38 fields including some (`batter_name`, `pitch_name`, `pfx_x/z`, `launch_speed`, etc.) that the current `backend/main.py` does **not** return. Those will just be `undefined` at runtime — the components guard against falsy values, so the UI degrades gracefully but you won't see batter names, movement, etc. until the backend is re-extended.

### 17. `frontend/src/components/StrikeZone.tsx`
The D3 visualization. ~170 lines.

**Props**:
- `pitches: Pitch[]` — pitches to draw normally (radius 8, opacity 0.8)
- `trailPitches?: Pitch[]` — optional faded prior pitches (radius 5, opacity 0.25). Used in PxP mode.
- `highlightPitch?: Pitch` — optional larger highlighted pitch (radius 10, white stroke). Used in PxP mode.

**How D3 + React coexist here**:
- A `useRef<SVGSVGElement>` points at the `<svg>` returned from the component.
- A `useEffect` runs whenever the three props change. Inside it:
  1. `d3.select(svgRef.current).selectAll('*').remove()` — wipe everything from last render. This is the **React-owns-the-svg-element, D3-owns-its-contents** pattern.
  2. Build two linear scales: `xScale` maps `plate_x` in feet (-2..2) → pixel x; `yScale` maps `plate_z` in feet (0.5..4.5) → pixel y *with y inverted* (higher z = lower pixel y, since SVG y grows downward).
  3. Draw the strike-zone rectangle (±0.83 ft horizontal, 1.5–3.5 ft vertical — MLB standard) and a 3×3 inner grid.
  4. `drawDot(...)` helper that does the D3 enter-pattern (`selectAll → data → enter → append`) and tacks a `<title>` child onto each circle for native browser tooltips.
  5. Calls `drawDot` for trail (if any), then main pitches, then highlight — so z-order is trail-behind, main, highlight-on-top.
- A `tooltipFor(d)` helper at the top builds the multi-line tooltip string from whatever fields exist (pitch name, velo, inning, count+batter, spin, break, result, and on contact: outcome + exit velo/LA/distance). Newlines render in `<title>` tooltips on most browsers.

**Statcast coordinate system to remember**:
- `plate_x`: horizontal, in feet, from catcher's perspective. **Negative = inside to a RH batter** (catcher's left, pitcher's right).
- `plate_z`: vertical, in feet, above home plate.
- Strike zone: ±0.83 ft wide × 1.5–3.5 ft tall is the standard. Actual zone is `sz_top`/`sz_bot` per batter, which we don't currently use.

### 18. `frontend/src/components/PitchByPitch.tsx`
The PxP navigation panel. Only rendered when `viewMode === 'pxp'`.

**Props**: `{ pitches, index, onIndexChange, fullTrail, onFullTrailChange }`. Owns no state — pure controlled component. The parent (`App.tsx`) holds the index.

**What it renders**:
- Header: inning + top/bot + batter name + side, then count/outs/pitch-of-AB on a smaller line.
- A vertical stat block: pitch name, velo, spin (rpm @ axis°), break (inches H/V), result. If the at-bat ended on this pitch: outcome. If the ball was hit into play: exit velo / launch angle / hit distance.
- Prev/Next buttons + an `index + 1 / total` counter.
- A "Show full game trail" checkbox bound to `fullTrail` — toggles whether the strike-zone trail shows only the current at-bat's prior pitches or every prior pitch in the game.
- A scrollable timeline below: each half-inning is a row, each at-bat in it is a clickable chip showing the batter's last name and AB result. Click a chip → `onIndexChange` jumps to that AB's first pitch (uses `atBatStartIndex` memo).

**Keyboard nav**: a `useEffect` registers a window `keydown` listener. `←`/`→` step prev/next unless the user is typing in an input/textarea. The listener is removed on unmount.

**`stat(label, value)` helper**: tiny inline function that skips rendering when value is null/undefined/empty/zero — that's why missing fields just disappear from the panel rather than rendering "—".

### 19. `frontend/src/components/PitchArsenal.tsx`
Compact summary table of pitch types in whatever set you pass it.

**Props**: `{ pitches, title? }`.

**Logic**: builds a `Map<pitch_type, Row>` aggregating count, sum of velo, sum of spin, sum of pfx_x/pfx_z. Sorts rows by count descending. Renders a 5-column mini-table: Type · N (%) · Velo · Spin · Break H/V.

**Wired up in App.tsx**: `arsenalPitches` reflects the current view mode — full game in `game`/`pxp` modes, the half-inning's pitches in `inning` mode, the at-bat's pitches in `atbat` mode.

### 20. `frontend/src/components/PitchLegend.tsx`
Static color legend for the strike-zone dot colors. Same `colorMap` keys/values as `StrikeZone.tsx` but hard-coded into a separate `items` array — if you add a new pitch description color, change both files.

---

## Frontend — shadcn/ui primitives

These were generated by `npx shadcn@latest add …` and live in `src/components/ui/`. You generally shouldn't hand-edit them; re-run the shadcn CLI to update.

### 21. `frontend/src/components/ui/button.tsx`
Wraps a native `<button>` with a `cva` (class-variance-authority) variant system: variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) × sizes (`xs`/`sm`/`default`/`lg`/`icon` variants). Supports an `asChild` prop that swaps the rendered element using Radix's `Slot.Root` — handy when you want a `<Button>` to actually render an `<a>` for example. Also exports `buttonVariants` for places (like the Calendar) that need to apply the same classes to non-buttons.

### 22. `frontend/src/components/ui/input.tsx`
Thin wrapper around `<input>` with Tailwind classes that match the design system. Forwards all props.

### 23. `frontend/src/components/ui/calendar.tsx`
Wraps `react-day-picker`'s `DayPicker` with shadcn styling. Two exports: `Calendar` (the main component) and `CalendarDayButton` (custom day cell that focuses itself when `modifiers.focused` is set). Replaces the default chevrons with Lucide icons.

In `App.tsx` you use it with `mode="single"`, `modifiers={{ hasGame }}` to add a green dot under dates that have a game (CSS via `modifiersClassNames`), and `disabled={(d) => !hasGame(d)}` to make non-game dates unclickable.

### 24. `frontend/src/components/ui/popover.tsx`
Thin shadcn wrapper around Radix's Popover primitives. Exports `Popover`, `PopoverTrigger`, `PopoverContent` (and a few unused ones: `Anchor`, `Header`, `Title`, `Description`). The trigger and content are tied together by Radix automatically as long as they share a parent `<Popover>`. `PopoverContent` is rendered into a portal, so its CSS stacking context is independent of its parent in the React tree.

---

## Empty directories

### 25. `models/`
Placeholder for trained models. `.gitignore` excludes `*.joblib` and `*.pkl`, so anything you save here won't be committed. Once you start training XGBoost, drop the serialized model file in here.

### 26. `notebooks/`
Placeholder for Jupyter exploration. Not loaded by anything in the app.

---

## Current state notes (worth knowing before you dig in)

1. **Backend ↔ frontend field mismatch.** `frontend/src/App.tsx`'s `Pitch` interface lists ~38 fields including `batter_name`, `pitch_name`, `pfx_x/z`, `launch_speed`, `home_team`, etc. The backend currently only returns 14 of those. The UI degrades gracefully (missing fields just disappear from the panels), but you won't see batter names, pitch arsenal movement numbers, hit data, etc., until the backend is extended again.

2. **`/games/` endpoint is broken.** It calls `statcast_pitcher` with the wrong keyword names (`start=`/`end=`/`pitcher_id=` instead of `start_dt`/`end_dt`/`player_id`) and doesn't group its result the way the frontend expects (`{game_date, game_pk, pitch_count}`). The Calendar popover will probably not populate until you fix this — it's the first thing to fix when you start running the app.

3. **No caching.** Every pitcher search re-hits Baseball Savant. Once you start training a model you'll want to persist data — either a sqlite table or parquet files keyed on `(pitcher_id, game_date)`.

4. **The model and NL-agent layers haven't started yet.** `models/` and `notebooks/` are empty placeholders. CLAUDE.md mentions XGBoost and a LangGraph NL agent as planned work.

---

## Suggested reading order (one-pass)

1. `CLAUDE.md` (project mission)
2. `backend/main.py` (data source)
3. `frontend/src/main.tsx` → `frontend/src/App.tsx` (control flow, state)
4. `frontend/src/lib/pitchGroups.ts` (data shaping)
5. `frontend/src/components/StrikeZone.tsx` (the visualization)
6. `frontend/src/components/PitchByPitch.tsx`
7. `frontend/src/components/PitchArsenal.tsx`
8. `frontend/src/components/PitchLegend.tsx`
9. Skim `frontend/src/components/ui/*` (mostly generated)
10. Skim configs (`vite.config.ts`, `tsconfig.*.json`, `eslint.config.js`, `components.json`)

If you want exercises to test understanding as you read: try to predict what each component does from its props before reading the body, then check; trace one full request (e.g., picking a date in the calendar) through every file it touches.
