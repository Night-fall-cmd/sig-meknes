import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { hasCoordinates } from "../lib/places.js";
import { IconButton } from "./UI.jsx";
const markerIcon = L.divIcon({
  className: "map-marker",
  html: '<img src="/icons/b2018.svg" alt=""/>',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -36],
});
function Viewport({ places, selectedPlace, route, origin }) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    const points = route?.geometry?.coordinates?.map(([lng, lat]) => [
      lat,
      lng,
    ]);
    if (points?.length) map.fitBounds(points, { padding: [40, 40] });
    else if (hasCoordinates(selectedPlace))
      map.flyTo([selectedPlace.latitude, selectedPlace.longitude], 15, {
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 0.5,
      });
    else if (places.length)
      map.fitBounds(
        places.map((p) => [p.latitude, p.longitude]),
        { padding: [40, 40], maxZoom: 15 },
      );
  }, [map, places, selectedPlace, route]);
  useEffect(() => {
    if (origin) map.flyTo([origin.latitude, origin.longitude], 15);
  }, [map, origin]);
  return null;
}
export default function MapView({
  places = [],
  selectedPlace,
  onSelectPlace,
  onDetail,
  route,
  origin,
  onLocate,
}) {
  const mapped = useMemo(() => places.filter(hasCoordinates), [places]);
  const [tileError, setTileError] = useState(false),
    [version, setVersion] = useState(0);
  return (
    <div className="map-panel">
      <MapContainer
        center={[33.895, -5.554]}
        zoom={14}
        className="tourist-map"
        scrollWheelZoom
      >
        <TileLayer
          key={version}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <Viewport
          places={mapped}
          selectedPlace={selectedPlace}
          route={route}
          origin={origin}
        />
        {route?.geometry?.coordinates && (
          <Polyline
            positions={route.geometry.coordinates.map(([lng, lat]) => [
              lat,
              lng,
            ])}
            pathOptions={{ color: "#64D6B1", weight: 5 }}
          />
        )}
        {mapped.map((place) => (
          <Marker
            key={place.id}
            title={place.name}
            alt={place.name}
            position={[place.latitude, place.longitude]}
            icon={markerIcon}
            eventHandlers={{ click: () => onSelectPlace?.(place) }}
          >
            <Popup>
              <strong>{place.name}</strong>
              <p>{place.address}</p>
              <button onClick={() => onDetail?.(place)}>
                Voir les détails →
              </button>
            </Popup>
          </Marker>
        ))}
        {origin && (
          <Marker
            title="Votre position"
            alt="Votre position"
            position={[origin.latitude, origin.longitude]}
            icon={markerIcon}
          >
            <Popup>Votre position</Popup>
          </Marker>
        )}
      </MapContainer>
      <span className="map-label">Médina & cité impériale</span>
      {onLocate && (
        <div className="map-locate">
          <IconButton name="locate" label="Me localiser" onClick={onLocate} />
        </div>
      )}
      {tileError && (
        <div className="map-tile-error" role="status">
          Fond de carte indisponible.{" "}
          <button
            onClick={() => {
              setTileError(false);
              setVersion((v) => v + 1);
            }}
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
