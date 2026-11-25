import { useEffect, useState } from "react";
import { normalizePayload } from "../lib/places.js";
export const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);
export function usePlaces() {
  const [places, setPlaces] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort("timeout"), 15000);
    setLoading(true);
    setError("");
    fetch(import.meta.env.VITE_PLACES_ENDPOINT || `${API_BASE}/pois`, {
      signal: c.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        if (!c.signal.aborted) setPlaces(normalizePayload(data));
      })
      .catch(() => {
        if (!c.signal.aborted || c.signal.reason === "timeout")
          setError(
            "Les lieux ne peuvent pas être chargés pour le moment. Vos favoris restent disponibles.",
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (!c.signal.aborted || c.signal.reason === "timeout")
          setLoading(false);
      });
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [revision]);
  return { places, loading, error, reload: () => setRevision((n) => n + 1) };
}
