import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Custom icon for driver location
const driverIcon = L.divIcon({
  html: `<div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to center map on user location
function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 13);
    }
  }, [position, map]);
  return null;
}

interface AvailableOrdersMapProps {
  orders: any[];
  onAccept: (order: any) => void;
  loadingId: string | null;
}

export function AvailableOrdersMap({ orders, onAccept, loadingId }: AvailableOrdersMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  // Center of Jakarta as default
  const defaultCenter: [number, number] = [-6.2088, 106.8456];

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.error('Error getting location:', error),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Filter orders that have valid pickup coordinates
  const validOrders = orders.filter(order => 
    order.pickupCoords && 
    typeof order.pickupCoords.lat === 'number' && 
    typeof order.pickupCoords.lng === 'number'
  );

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg relative z-0">
      <MapContainer 
        center={userLocation || defaultCenter} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && (
          <>
            <Marker position={userLocation} icon={driverIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <RecenterMap position={userLocation} />
          </>
        )}

        {validOrders.map((order) => (
          <Marker 
            key={order.id} 
            position={[order.pickupCoords.lat, order.pickupCoords.lng]}
          >
            <Popup minWidth={220}>
              <div className="p-2">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-blue-900 text-sm">{order.serviceType}</h3>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 font-mono mb-3 truncate">{order.id}</p>
                
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1 mr-2 flex-shrink-0"></div>
                    <p className="text-gray-700 line-clamp-2"><span className="font-semibold">From:</span> {order.pickup}</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1 mr-2 flex-shrink-0"></div>
                    <p className="text-gray-700 line-clamp-2"><span className="font-semibold">To:</span> {order.destination}</p>
                  </div>
                </div>

                <button
                  onClick={() => onAccept(order)}
                  disabled={loadingId === order.id}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {loadingId === order.id ? 'Accepting...' : 'Accept Order'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {!userLocation && (
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200 text-[10px] font-bold text-gray-600 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          Locating you...
        </div>
      )}

      {validOrders.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/60 backdrop-blur-[1px] z-[1000] pointer-events-none">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 text-center max-w-xs">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 mb-1">No Orders Nearby</h4>
            <p className="text-xs text-gray-500">We couldn't find any pending orders with location data in your area.</p>
          </div>
        </div>
      )}
    </div>
  );
}
