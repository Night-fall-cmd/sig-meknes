import os
import psycopg
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="SIG Touristique Meknès")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/pois")
def liste_pois(categorie: str | None = None):
    sql = """SELECT id, nom, categorie, adresse, horaires, description, photos,
                    ST_AsGeoJSON(geom)::json FROM poi"""
    params = []
    if categorie:
        sql += " WHERE categorie = %s"
        params.append(categorie)
    sql += " ORDER BY id"
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        lignes = conn.execute(sql, params).fetchall()
    return {"type": "FeatureCollection", "features": [
        {"type": "Feature", "geometry": r[7],
         "properties": {"id": r[0], "nom": r[1], "categorie": r[2], "adresse": r[3],
                        "horaires": r[4], "description": r[5], "photos": r[6]}}
        for r in lignes]}



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

