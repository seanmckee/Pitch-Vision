from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybaseball import statcast_pitcher
import pandas as pd
from pybaseball import playerid_lookup
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
    
    cols = ['pitch_type', 'plate_x', 'plate_z', 'description', 
            'release_speed', 'release_spin_rate', 'sz_top', 'sz_bot', 'game_pk', 'game_date', 'inning_topbot', 'inning', 'at_bat_number', 'pitch_number']
    data = data[cols].dropna(subset=['plate_x', 'plate_z'])
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