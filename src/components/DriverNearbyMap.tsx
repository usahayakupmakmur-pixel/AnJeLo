import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { db, collection, query, where, onSnapshot, updateDoc, doc } from '../firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, Package, User, Clock, CheckCircle2, XCircle, Info } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for driver location
const driverIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
          <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
        </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Helper component to center map on user location
function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 14);
    }
  }, [position, map]);
  return null;
}

export function DriverNearbyMap() {
  const [orders, setOrders] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const { user, profile } = useAuth();

  // Center of Jakarta as default
  const defaultCenter: [number, number] = [-6.2088, 106.8456];

  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.error('Error getting location:', error),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    if (!user || profile?.role !== 'driver') return;

    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(pendingOrders);
    });

    return unsubscribe;
  }, [user, profile]);

  const acceptOrder = async (order: any) => {
    if (!user) return;
    setLoadingId(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'accepted',
        driverId: user.uid,
      });

      // Notify user via API
      try {
        await fetch('/api/notify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: order.userId,
            orderId: order.id,
            serviceType: order.serviceType
          })
        });
      } catch (e) {
        console.error('Notification failed', e);
      }

      setSelectedOrder(null);
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order.');
    } finally {
      setLoadingId(null);
    }
  };

  const validOrders = orders.filter(order => 
    order.pickupCoords && 
    typeof order.pickupCoords.lat === 'number' && 
    typeof order.pickupCoords.lng === 'number'
  );

  if (profile?.role !== 'driver') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <XCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-xs">Only registered drivers can access the nearby orders map.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Nearby Orders</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-time Map View</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
            {validOrders.length} Available
          </span>
        </div>
      </div>

      <div className="relative h-[65vh] rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl z-0">
        <MapContainer 
          center={userLocation || defaultCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {userLocation && (
            <>
              <Marker position={userLocation} icon={driverIcon}>
                <Popup>
                  <div className="text-xs font-bold">Your Location</div>
                </Popup>
              </Marker>
              <RecenterMap position={userLocation} />
            </>
          )}

          {validOrders.map((order) => (
            <Marker 
              key={order.id} 
              position={[order.pickupCoords.lat, order.pickupCoords.lng]}
              eventHandlers={{
                click: () => setSelectedOrder(order),
              }}
            >
              <Popup minWidth={200}>
                <div className="p-1">
                  <p className="font-black text-blue-900 text-sm mb-1">{order.serviceType}</p>
                  <p className="text-[10px] text-slate-500 mb-2 line-clamp-1">{order.pickup}</p>
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-wider"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Info Card */}
        <AnimatePresence>
          {selectedOrder && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-6 left-6 right-6 z-[1000] glass-card p-6 border-white/40 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <Package size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 leading-none mb-1">{selectedOrder.serviceType}</h3>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedOrder.price || 0)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <XCircle size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pickup</p>
                    <p className="text-xs font-medium text-slate-700">{selectedOrder.pickup}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
                    <p className="text-xs font-medium text-slate-700">{selectedOrder.destination}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => acceptOrder(selectedOrder)}
                disabled={loadingId === selectedOrder.id}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingId === selectedOrder.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Accept Order
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Controls */}
        <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
          <button 
            onClick={() => userLocation && setUserLocation([...userLocation])}
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-700 shadow-lg border-white/40 hover:bg-white transition-all active:scale-95"
          >
            <Navigation size={20} />
          </button>
          <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-700 shadow-lg border-white/40">
            <Info size={20} />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-6 rounded-[2rem] border-white/40">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Distance Filter</p>
          <p className="text-xl font-black text-slate-900">5.0 km</p>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-blue-600 rounded-full"></div>
          </div>
        </div>
        <div className="glass p-6 rounded-[2rem] border-white/40">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Auto-Refresh</p>
          <p className="text-xl font-black text-slate-900">Active</p>
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= 4 ? 'bg-green-500' : 'bg-slate-100'}`}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
