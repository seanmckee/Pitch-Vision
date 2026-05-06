from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybaseball import statcast_pitcher
import pandas as pd
from pybaseball import playerid_lookup, playerid_reverse_lookup
from datetime import date, timedelta


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


@app.get("/pitches/{pitcher_id}")
def get_pitches(pitcher_id: int, start: str, end: str):
    data = statcast_pitcher(start, end, pitcher_id)

    cols = [
        # identity / context
        'pitch_type', 'pitch_name', 'description', 'type', 'events',
        'game_pk', 'game_date', 'home_team', 'away_team',
        'inning_topbot', 'inning', 'at_bat_number', 'pitch_number',
        'batter', 'balls', 'strikes', 'outs_when_up',
        'stand', 'p_throws', 'zone',
        # location / strike zone
        'plate_x', 'plate_z', 'sz_top', 'sz_bot',
        # velocity / spin
        'release_speed', 'effective_speed', 'release_spin_rate', 'spin_axis',
        # release geometry
        'release_pos_x', 'release_pos_z', 'release_extension',
        # movement
        'pfx_x', 'pfx_z',
        # batted-ball outcome (only populated on contact)
        'launch_speed', 'launch_angle', 'bb_type', 'hit_distance_sc',
        'estimated_ba_using_speedangle', 'estimated_woba_using_speedangle',
    ]
    available = [c for c in cols if c in data.columns]
    data = data[available].dropna(subset=['plate_x', 'plate_z'])

    name_map: dict[int, str] = {}
    batter_ids = [int(b) for b in data['batter'].dropna().unique().tolist()]
    if batter_ids:
        try:
            lookup = playerid_reverse_lookup(batter_ids, key_type='mlbam')
            for _, row in lookup.iterrows():
                first = str(row.get('name_first', '') or '').strip()
                last = str(row.get('name_last', '') or '').strip()
                full = ' '.join(p for p in (first, last) if p).title()
                name_map[int(row['key_mlbam'])] = full or str(int(row['key_mlbam']))
        except Exception:
            name_map = {}

    def resolve_name(b):
        if pd.isna(b):
            return ''
        bid = int(b)
        return name_map.get(bid, str(bid))

    data = data.assign(batter_name=data['batter'].map(resolve_name))
    data = data.fillna(0)  # replace remaining NaNs with 0

    return data.to_dict(orient='records')


@app.get("/players/search")
def search_players(name: str):
    parts = name.strip().split()
    last = parts[-1]
    first = parts[0] if len(parts) > 1 else ''
    
    results = playerid_lookup(last, first)
    return results[['name_first', 'name_last', 'key_mlbam']].to_dict(orient='records')


@app.get("/games/{pitcher_id}")
def get_games(pitcher_id: int):
    today = date.today()
    df = statcast_pitcher(
        start_dt=str(today - timedelta(days=365)),
        end_dt=str(today),
        player_id=pitcher_id,
    )
    if df is None or df.empty:
        return []

    games = (
        df.groupby(["game_date", "game_pk"], as_index=False)
          .size()
          .rename(columns={"size": "pitch_count"})
    )
    games["game_date"] = pd.to_datetime(games["game_date"]).dt.strftime("%Y-%m-%d")
    games = games.sort_values("game_date", ascending=False)
    return games.to_dict(orient="records")