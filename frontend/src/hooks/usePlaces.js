import { useCallback, useEffect, useState } from 'react';

// FastAPI backend (docker-compose exposes it on port 8000).
// Override with VITE_API_URL in frontend/.env if needed.
const API_BASE = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/$/, '');
// GET /pois  ->  GeoJSON FeatureCollection (optional filter: /pois?categorie=Monument)
const PLACES_ENDPOINT =
  import.meta.env.VITE_PLACES_ENDPOINT || `${API_BASE}/pois`;

function normalizePlace(item, index) {
  const coordinates = item.coordinates || item.geometry?.coordinates;
  let latitude = item.latitude ?? item.lat ?? item.location?.lat;
  let longitude = item.longitude ?? item.lng ?? item.lon ?? item.location?.lng;
  // GeoJSON coordinates are [longitude, latitude].
  if (
    (!Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude))) &&
    Array.isArray(coordinates)
  ) {
    [longitude, latitude] = coordinates;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  return {
    ...item,
    id: item.id ?? item._id ?? item.uuid ?? `place-${index}`,
    name: item.name ?? item.nom ?? item.title ?? 'Site sans nom',
    description: item.description ?? item.desc ?? item.summary ?? '',
    category: item.category ?? item.categorie ?? item.type ?? 'Autre',
    address: item.address ?? item.adresse ?? '',
    // /pois returns `photos` as an array of URLs (may be empty).
    image:
      item.image ??
      item.image_url ??
      item.photo ??
      item.photo_url ??
      (Array.isArray(item.photos) ? item.photos[0] : undefined) ??
      '',
    horaires: item.horaires ?? '',
    latitude: Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null,
    longitude: Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null,
  };
}

function extractArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.features)) {
    return payload.features.map((feature) => ({
      ...feature.properties,
      geometry: feature.geometry,
      coordinates: feature.geometry?.coordinates,
    }));
  }
  for (const key of ['places', 'sites', 'pois', 'results', 'items', 'data']) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (payload?.[key] && Array.isArray(payload[key].features)) {
      return payload[key].features.map((feature) => ({
        ...feature.properties,
        geometry: feature.geometry,
        coordinates: feature.geometry?.coordinates,
      }));
    }
  }
  return [];
}

export function usePlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!PLACES_ENDPOINT) throw new Error('Aucune URL API configurée.');
      const response = await fetch(PLACES_ENDPOINT, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok)
        throw new Error(`L’API a répondu avec le statut ${response.status}.`);
      const payload = await response.json();
      const rows = extractArray(payload);
      setPlaces(rows.map(normalizePlace));
    } catch (err) {
      setPlaces([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur inconnue lors du chargement.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);
  return { places, loading, error, reload };
}
