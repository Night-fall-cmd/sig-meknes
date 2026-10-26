import os
import psycopg
from fastapi import FastAPI

app = FastAPI(title="SIG Touristique Meknès")


@app.get("/")
def root():
    return {"message": "API SIG Meknès en marche"}


@app.get("/health")
def health():
    try:
        with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
            version = conn.execute("SELECT PostGIS_Version()").fetchone()[0]
        return {"api": "ok", "db": "ok", "postgis": version}
    except Exception as e:
        return {"api": "ok", "db": "erreur", "detail": str(e)}
