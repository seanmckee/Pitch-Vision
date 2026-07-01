import gc
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybaseball import statcast_pitcher, playerid_lookup, playerid_reverse_lookup
from datetime import date, timedelta
import pandas as pd

DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

# Render free tier has 512MB RAM — full-season statcast in one call can OOM
GAMES_LOOKBACK_DAYS = int(os.getenv("GAMES_LOOKBACK_DAYS", "120"))
GAMES_CHUNK_DAYS = int(os.getenv("GAMES_CHUNK_DAYS", "30"))

# Matches frontend Pitch interface in App.tsx — only what the UI uses
PITCH_COLS = [
    'pitch_type', 'pitch_name', 'plate_x', 'plate_z', 'description', 'type',
    'release_speed', 'effective_speed', 'release_spin_rate', 'spin_axis',
    'release_pos_x', 'release_pos_z', 'release_extension',
    'pfx_x', 'pfx_z', 'zone', 'sz_top', 'sz_bot',
    'game_pk', 'game_date', 'home_team', 'away_team',
    'inning_topbot', 'inning', 'at_bat_number', 'pitch_number', 'batter',
    'stand', 'p_throws', 'balls', 'strikes', 'outs_when_up', 'events',
    'launch_speed', 'launch_angle', 'bb_type', 'hit_distance_sc',
    'estimated_ba_using_speedangle', 'estimated_woba_using_speedangle',
]

STRING_COLS = {
    'pitch_type', 'pitch_name', 'description', 'type', 'game_date',
    'inning_topbot', 'events', 'batter_name', 'stand', 'p_throws',
    'home_team', 'away_team', 'bb_type',
}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Pitch Vision API"}


def _attach_batter_names(data):
    unique_batter_ids = data['batter'].dropna().unique().tolist()
    if not unique_batter_ids:
        data['batter_name'] = ''
        return data

    lookup = playerid_reverse_lookup(unique_batter_ids, key_type='mlbam')
    name_map = {
        row['key_mlbam']: f"{row['name_first']} {row['name_last']}".title()
        for _, row in lookup.iterrows()
    }
    data = data.copy()
    data['batter_name'] = data['batter'].map(name_map).fillna('')
    return data


def _fill_missing(data):
    for col in data.columns:
        if col in STRING_COLS:
            data[col] = data[col].fillna('')
        else:
            data[col] = data[col].fillna(0)
    return data


@app.get("/pitches/{pitcher_id}")
def get_pitches(pitcher_id: int, start: str, end: str):
    raw = statcast_pitcher(start, end, pitcher_id)
    try:
        data = raw[PITCH_COLS].dropna(subset=['plate_x', 'plate_z'])
        data = _attach_batter_names(data)
        data = _fill_missing(data)
        return data.to_dict(orient='records')
    finally:
        del raw
        gc.collect()


@app.get("/players/search")
def search_players(name: str):
    if not name.strip():
        return {"error": "Name is required (first, last)"}
    parts = name.strip().split()
    last = parts[-1]
    first = parts[0] if len(parts) > 1 else ''

    results = playerid_lookup(last, first)
    out = results[['name_first', 'name_last', 'key_mlbam']].to_dict(orient='records')
    gc.collect()
    return out


@app.get("/games/{pitcher_id}")
def get_games(pitcher_id: int):
    today = date.today()
    start_date = today - timedelta(days=GAMES_LOOKBACK_DAYS)
    frames: list[pd.DataFrame] = []
    cursor = start_date

    while cursor <= today:
        chunk_end = min(cursor + timedelta(days=GAMES_CHUNK_DAYS), today)
        raw = statcast_pitcher(cursor.isoformat(), chunk_end.isoformat(), pitcher_id)
        try:
            if raw is not None and not raw.empty:
                frames.append(raw[['game_date', 'game_pk']])
        finally:
            del raw

        cursor = chunk_end + timedelta(days=1)

    if not frames:
        return []

    games = pd.concat(frames, ignore_index=True)
    del frames
    summary = games.groupby(['game_date', 'game_pk']).size().reset_index(name='pitch_count')
    del games
    summary = summary.sort_values('game_date', ascending=False)
    out = summary.to_dict(orient='records')
    del summary
    gc.collect()
    return out
