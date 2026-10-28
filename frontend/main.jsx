import React from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <div>
      <h1>SIG Touristique Meknès</h1>

      <MapContainer
        center={[33.895, -5.554]}
        zoom={13}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[33.895, -5.554]}>
          <Popup>Welcome to Meknès!</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
