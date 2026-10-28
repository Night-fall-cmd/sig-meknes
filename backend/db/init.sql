CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS poi (
  id          INTEGER PRIMARY KEY,
  nom         TEXT NOT NULL UNIQUE,
  categorie   TEXT NOT NULL,
  adresse     TEXT,
  horaires    TEXT,
  description TEXT,
  photos      TEXT[] DEFAULT '{}',
  source      TEXT,
  geom        GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS poi_geom_idx ON poi USING GIST (geom);
CREATE INDEX IF NOT EXISTS poi_categorie_idx ON poi (categorie);
