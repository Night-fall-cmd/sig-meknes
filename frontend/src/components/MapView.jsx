import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

const markerIcon = L.divIcon({
  className: 'custom-map-marker',
  html: '<span class="custom-map-marker__pin"><span></span></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 32],
  popupAnchor: [0, -30],
});

function FitPlaces({ places, selectedPlace }) {
  const map = useMap();
  useEffect(() => {
    const selected =
      selectedPlace &&
      Number.isFinite(selectedPlace.latitude) &&
      Number.isFinite(selectedPlace.longitude)
        ? [selectedPlace.latitude, selectedPlace.longitude]
        : null;
    if (selected) {
      map.flyTo(selected, Math.max(map.getZoom(), 15), { duration: 0.6 });
      return;
    }
    const points = places
      .filter(
        (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      )
      .map((p) => [p.latitude, p.longitude]);
    if (points.length > 1)
      map.fitBounds(points, { padding: [38, 38], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 14);
  }, [map, places, selectedPlace]);
  return null;
}

export default function MapView({ places = [], selectedPlace, onSelectPlace }) {
  const mappedPlaces = places.filter(
    (place) =>
      Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
  );
  // Only the base map's initial viewport is centered on Meknès; no tourist sites are hard-coded.
  return (
    <div className="map-panel">
      <div className="map-panel__top">
        <div className="map-legend">
          <span className="map-legend__marker" />
          <span>Sites touristiques</span>
        </div>
        <span className="map-panel__hint">
          Sélectionnez un marqueur pour voir les détails
        </span>
      </div>
      <div className="map-frame">
        <MapContainer
          center={[33.895, -5.554]}
          zoom={13}
          scrollWheelZoom
          className="tourist-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitPlaces places={mappedPlaces} selectedPlace={selectedPlace} />
          {mappedPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={markerIcon}
              eventHandlers={{ click: () => onSelectPlace?.(place) }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{place.name}</strong>
                  {place.category && <span>{place.category}</span>}
                  {place.description && <p>{place.description}</p>}
                  {place.address && <small>{place.address}</small>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        {!mappedPlaces.length && (
          <div className="map-empty-overlay">
            <div className="map-empty-overlay__icon">⌖</div>
            <strong>Aucun site géolocalisé pour l’instant</strong>
            <span>
              Les marqueurs apparaîtront automatiquement dès que l’API renverra
              les coordonnées.
            </span>
          </div>
        )}
      </div>
      <div className="map-panel__bottom">
        <span>© OpenStreetMap contributors</span>
        <span>
          {mappedPlaces.length} marqueur{mappedPlaces.length > 1 ? 's' : ''}{' '}
          affiché{mappedPlaces.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
