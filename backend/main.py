import os
import secrets
from typing import Literal

import httpx
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration (valeurs lues dans le fichier .env via Docker Compose)
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ["DATABASE_URL"]
OSRM_URL = os.environ.get("OSRM_URL", "http://osrm:5000").rstrip("/")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")
CORS_ORIGINS = [o.strip() for o in os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]

TAGS = [
    {"name": "Sites", "description": "Lecture des sites touristiques (GeoJSON)."},
    {"name": "Recherche", "description": "Recherche par texte, tolérante aux accents et aux fautes."},
    {"name": "Itinéraire", "description": "Calcul d'itinéraire en voiture via OSRM."},
    {"name": "Chatbot", "description": "Guide virtuel basé sur Ollama."},
    {"name": "Administration", "description": "Ajout, modification et suppression de sites. Nécessite l'en-tête X-API-Key."},
    {"name": "Système", "description": "Vérification de l'état de l'API."},
]

app = FastAPI(
    title="SIG Touristique Meknès",
    description="API de la plateforme touristique de Meknès : sites, recherche, itinéraires et chatbot.",
    version="0.2.0",
    openapi_tags=TAGS,
)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------------------
# Base de données
# ---------------------------------------------------------------------------
def connexion():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


COLONNES = ("id, nom, categorie, adresse, horaires, description, photos, source, "
            "ST_AsGeoJSON(geom)::json AS geometry")
PROPRIETES = ("id", "nom", "categorie", "adresse", "horaires", "description", "photos", "source")


def feature(ligne: dict, score: float | None = None) -> dict:
    proprietes = {k: ligne[k] for k in PROPRIETES}
    if score is not None:
        proprietes["score"] = round(score, 2)
    return {"type": "Feature", "geometry": ligne["geometry"], "properties": proprietes}


def collection(lignes: list[dict]) -> dict:
    return {"type": "FeatureCollection", "features": [feature(r, r.get("score")) for r in lignes]}


# ---------------------------------------------------------------------------
# Sites (SIG-12 et SIG-13)
# ---------------------------------------------------------------------------
@app.get("/pois", tags=["Sites"], summary="Liste des sites")
def liste_pois(
    categorie: str | None = Query(None, description="Filtre par catégorie, ex. Monument"),
    bbox: str | None = Query(None, description="Zone de la carte : minLon,minLat,maxLon,maxLat"),
):
    """Renvoie les sites en GeoJSON. Les filtres `categorie` et `bbox` sont optionnels."""
    sql = f"SELECT {COLONNES} FROM poi WHERE TRUE"
    params: list = []
    if categorie:
        sql += " AND categorie = %s"
        params.append(categorie)
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = (float(x) for x in bbox.split(","))
        except ValueError:
            raise HTTPException(422, "bbox doit être : minLon,minLat,maxLon,maxLat")
        sql += " AND geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)"
        params += [min_lon, min_lat, max_lon, max_lat]
    sql += " ORDER BY id"
    with connexion() as conn:
        return collection(conn.execute(sql, params).fetchall())


@app.get("/pois/{poi_id}", tags=["Sites"], summary="Détail d'un site")
def detail_poi(poi_id: int):
    with connexion() as conn:
        ligne = conn.execute(f"SELECT {COLONNES} FROM poi WHERE id = %s", [poi_id]).fetchone()
    if ligne is None:
        raise HTTPException(404, "Site introuvable")
    return feature(ligne)


class PoiIn(BaseModel):
    nom: str = Field(min_length=2, max_length=200)
    categorie: str = Field(min_length=2, max_length=50)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    adresse: str | None = None
    horaires: str | None = None
    description: str | None = None
    photos: list[str] = []
    source: str | None = None


def verifier_cle(x_api_key: str | None = Header(None, alias="X-API-Key")):
    """Protège l'ajout, la modification et la suppression par une clé (ADMIN_KEY dans .env)."""
    if not ADMIN_KEY:
        raise HTTPException(403, "Modifications désactivées : ADMIN_KEY n'est pas configurée.")
    if not x_api_key or not secrets.compare_digest(x_api_key, ADMIN_KEY):
        raise HTTPException(401, "Clé API invalide ou absente (en-tête X-API-Key).")


def champs(p: PoiIn) -> list:
    return [p.nom, p.categorie, p.adresse, p.horaires, p.description, p.photos, p.source,
            p.longitude, p.latitude]


@app.post("/pois", status_code=201, tags=["Administration"], summary="Ajouter un site",
          dependencies=[Depends(verifier_cle)])
def creer_poi(poi: PoiIn):
    sql = """INSERT INTO poi (id, nom, categorie, adresse, horaires, description, photos, source, geom)
             VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM poi), %s, %s, %s, %s, %s, %s, %s,
                     ST_SetSRID(ST_MakePoint(%s, %s), 4326))
             RETURNING id"""
    try:
        with connexion() as conn:
            nouvel_id = conn.execute(sql, champs(poi)).fetchone()["id"]
            ligne = conn.execute(f"SELECT {COLONNES} FROM poi WHERE id = %s", [nouvel_id]).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Un site avec ce nom existe déjà.")
    return feature(ligne)


@app.put("/pois/{poi_id}", tags=["Administration"], summary="Modifier un site",
         dependencies=[Depends(verifier_cle)])
def modifier_poi(poi_id: int, poi: PoiIn):
    sql = """UPDATE poi SET nom=%s, categorie=%s, adresse=%s, horaires=%s, description=%s,
                    photos=%s, source=%s, geom=ST_SetSRID(ST_MakePoint(%s, %s), 4326)
             WHERE id = %s RETURNING id"""
    try:
        with connexion() as conn:
            if conn.execute(sql, champs(poi) + [poi_id]).fetchone() is None:
                raise HTTPException(404, "Site introuvable")
            ligne = conn.execute(f"SELECT {COLONNES} FROM poi WHERE id = %s", [poi_id]).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Un autre site porte déjà ce nom.")
    return feature(ligne)


@app.delete("/pois/{poi_id}", status_code=204, tags=["Administration"],
            summary="Supprimer un site", dependencies=[Depends(verifier_cle)])
def supprimer_poi(poi_id: int):
    with connexion() as conn:
        if conn.execute("DELETE FROM poi WHERE id = %s RETURNING id", [poi_id]).fetchone() is None:
            raise HTTPException(404, "Site introuvable")
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Recherche (SIG-14)
# ---------------------------------------------------------------------------
SQL_RECHERCHE = f"""
SELECT * FROM (
  SELECT {COLONNES},
         GREATEST(
           word_similarity(unaccent(%(q)s::text), unaccent(nom)),
           similarity(unaccent(%(q)s::text), unaccent(nom)),
           CASE WHEN unaccent(description) ILIKE '%%' || unaccent(%(q)s::text) || '%%' THEN 0.4 ELSE 0 END,
           CASE WHEN unaccent(categorie) ILIKE '%%' || unaccent(%(q)s::text) || '%%' THEN 0.4 ELSE 0 END
         ) AS score
  FROM poi
  WHERE (%(categorie)s::text IS NULL OR categorie = %(categorie)s::text)
) t
WHERE score >= 0.3
ORDER BY score DESC, nom
LIMIT %(limite)s
"""


@app.get("/search", tags=["Recherche"], summary="Rechercher un site")
def recherche(
    q: str = Query(..., min_length=2, max_length=100, description="Texte cherché, ex. mausolee"),
    categorie: str | None = Query(None, description="Limiter à une catégorie"),
    limite: int = Query(10, ge=1, le=50),
):
    """Recherche dans le nom, la description et la catégorie. Ignore les accents et tolère les fautes.
    Les résultats sont triés du plus pertinent au moins pertinent (champ `score`)."""
    with connexion() as conn:
        lignes = conn.execute(SQL_RECHERCHE, {"q": q.strip(), "categorie": categorie,
                                              "limite": limite}).fetchall()
    return collection(lignes)


# ---------------------------------------------------------------------------
# Itinéraire (SIG-15)
# ---------------------------------------------------------------------------
@app.get("/route", tags=["Itinéraire"], summary="Calculer un itinéraire")
def itineraire(
    from_lat: float = Query(..., ge=-90, le=90, description="Latitude du départ"),
    from_lng: float = Query(..., ge=-180, le=180, description="Longitude du départ"),
    to_lat: float = Query(..., ge=-90, le=90, description="Latitude de l'arrivée"),
    to_lng: float = Query(..., ge=-180, le=180, description="Longitude de l'arrivée"),
):
    """Renvoie la distance, la durée et le tracé (GeoJSON LineString, longitude en premier)."""
    # OSRM attend : longitude,latitude
    url = f"{OSRM_URL}/route/v1/driving/{from_lng},{from_lat};{to_lng},{to_lat}"
    try:
        reponse = httpx.get(url, params={"overview": "full", "geometries": "geojson"}, timeout=10)
    except httpx.HTTPError:
        raise HTTPException(503, "Service d'itinéraire indisponible. Réessayez plus tard.")
    donnees = reponse.json() if reponse.headers.get("content-type", "").startswith("application/json") else {}
    if reponse.status_code != 200 or donnees.get("code") != "Ok" or not donnees.get("routes"):
        raise HTTPException(404, "Aucun itinéraire trouvé entre ces deux points.")
    route = donnees["routes"][0]
    return {
        "distance_m": round(route["distance"]),
        "distance_km": round(route["distance"] / 1000, 1),
        "duree_s": round(route["duration"]),
        "duree_min": max(1, round(route["duration"] / 60)),
        "geometry": route["geometry"],
    }


# ---------------------------------------------------------------------------
# Chatbot (SIG-16)
# ---------------------------------------------------------------------------
PROMPT_SYSTEME = (
    "Tu es un guide touristique de Meknès, au Maroc. Tu réponds en français, de façon courte "
    "et chaleureuse. Tu parles uniquement de Meknès et de ses environs (monuments, musées, "
    "restaurants, hôtels, déplacements). Si tu n'es pas sûr d'une information, par exemple des "
    "horaires ou des prix, dis-le et conseille de vérifier sur place. N'invente jamais de lieu."
)


class MessageChat(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    historique: list[MessageChat] = Field(default=[], max_length=20)


@app.post("/chat", tags=["Chatbot"], summary="Poser une question au guide")
def chat(demande: ChatIn):
    """Envoie la question (et les derniers échanges) au modèle Ollama et renvoie sa réponse.
    Sur un ordinateur sans carte graphique, la réponse peut prendre plusieurs secondes."""
    messages = [{"role": "system", "content": PROMPT_SYSTEME}]
    messages += [m.model_dump() for m in demande.historique[-6:]]
    messages.append({"role": "user", "content": demande.message})
    try:
        reponse = httpx.post(f"{OLLAMA_URL}/api/chat",
                             json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
                             timeout=120)
    except httpx.TimeoutException:
        raise HTTPException(504, "Le guide met trop de temps à répondre. Réessayez.")
    except httpx.HTTPError:
        raise HTTPException(503, "Le guide virtuel est indisponible pour le moment.")
    if reponse.status_code != 200:
        raise HTTPException(502, "Le modèle n'a pas pu répondre (modèle absent ou erreur Ollama).")
    texte = reponse.json().get("message", {}).get("content", "").strip()
    return {"reponse": texte, "modele": OLLAMA_MODEL}


# ---------------------------------------------------------------------------
# Système
# ---------------------------------------------------------------------------
@app.get("/", tags=["Système"], include_in_schema=False)
def racine():
    return {"message": "API SIG Meknès en marche", "documentation": "/docs"}


@app.get("/health", tags=["Système"], summary="État de l'API et de la base")
def sante():
    try:
        with connexion() as conn:
            version = conn.execute("SELECT PostGIS_Version() AS v").fetchone()["v"]
            nombre = conn.execute("SELECT COUNT(*) AS n FROM poi").fetchone()["n"]
        return {"api": "ok", "db": "ok", "postgis": version, "sites": nombre}
    except Exception as e:
        return {"api": "ok", "db": "erreur", "detail": str(e)}
