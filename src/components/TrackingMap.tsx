import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Vite
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const driverIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/149/149060.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface MapProps {
  pickup?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  driver?: { lat: number; lng: number };
  history?: { lat: number; lng: number }[];
  className?: string;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export function TrackingMap({ pickup, destination, driver, history = [], className = "h-64 w-full rounded-xl" }: MapProps) {
  const defaultCenter: [number, number] = [-6.2088, 106.8456]; // Jakarta
  const center = driver ? [driver.lat, driver.lng] as [number, number] : 
                 pickup ? [pickup.lat, pickup.lng] as [number, number] : 
                 defaultCenter;

  const polylinePositions = history.map(h => [h.lat, h.lng] as [number, number]);

  return (
    <div className={className}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} />
        
        {history.length > 1 && (
          <Polyline positions={polylinePositions} color="blue" weight={3} opacity={0.6} dashArray="5, 10" />
        )}

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>Pickup Point</Popup>
          </Marker>
        )}
        
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>Destination Point</Popup>
          </Marker>
        )}
        
        {driver && (
          <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
            <Popup>Driver's Current Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
