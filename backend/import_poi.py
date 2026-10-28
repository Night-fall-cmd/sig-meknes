"""Importe data/poi.geojson dans la table poi (peut être relancé sans créer de doublons).

Depuis la racine du projet, avec Docker Compose lancé :
    docker compose exec backend python import_poi.py
"""
import json
import os
import sys

import psycopg

CHEMIN = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("POI_GEOJSON", "/data/poi.geojson")

REQUETE = """
INSERT INTO poi (id, nom, categorie, adresse, horaires, description, photos, source, geom)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom, categorie = EXCLUDED.categorie, adresse = EXCLUDED.adresse,
  horaires = EXCLUDED.horaires, description = EXCLUDED.description,
  photos = EXCLUDED.photos, source = EXCLUDED.source, geom = EXCLUDED.geom
"""


def main():
    with open(CHEMIN, encoding="utf-8") as f:
        features = json.load(f)["features"]

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        for ft in features:
            p = ft["properties"]
            lon, lat = ft["geometry"]["coordinates"]
            conn.execute(REQUETE, (p["id"], p["nom"], p["categorie"], p["adresse"], p["horaires"],
                                   p["description"], p["photos"], p["source"], lon, lat))
        total = conn.execute("SELECT COUNT(*) FROM poi").fetchone()[0]
    print(f"{len(features)} sites importés. Lignes dans la table poi : {total}")


if __name__ == "__main__":
    main()
