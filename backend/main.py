from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybaseball import statcast_pitcher
import pandas as pd
from pybaseball import playerid_lookup


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
            'release_speed', 'release_spin_rate', 'sz_top', 'sz_bot']
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


