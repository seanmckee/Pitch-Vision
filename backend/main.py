from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybaseball import statcast_pitcher, playerid_lookup, playerid_reverse_lookup
from datetime import date, timedelta

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
    allow_origins=["http://localhost:5173"],
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
    data = raw[PITCH_COLS].dropna(subset=['plate_x', 'plate_z'])
    data = _attach_batter_names(data)
    data = _fill_missing(data)
    return data.to_dict(orient='records')


@app.get("/players/search")
def search_players(name: str):
    if not name.strip():
        return {"error": "Name is required (first, last)"}
    parts = name.strip().split()
    last = parts[-1]
    first = parts[0] if len(parts) > 1 else ''

    results = playerid_lookup(last, first)
    return results[['name_first', 'name_last', 'key_mlbam']].to_dict(orient='records')


@app.get("/games/{pitcher_id}")
def get_games(pitcher_id: int):
    today = date.today()
    start = (today - timedelta(days=365)).isoformat()
    end = today.isoformat()
    games = statcast_pitcher(start, end, pitcher_id)[['game_date', 'game_pk']]
    summary = games.groupby(['game_date', 'game_pk']).size().reset_index(name='pitch_count')
    summary = summary.sort_values('game_date', ascending=False)
    return summary.to_dict(orient='records')
