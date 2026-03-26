import React, { useEffect, useState } from 'react';
import { db, collection, query, where, onSnapshot, updateDoc, doc } from '../firebase';
import { useAuth } from './AuthContext';
import { AvailableOrdersMap } from './AvailableOrdersMap';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export function NearbyOrders() {
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile || profile.role !== 'driver' || !profile.isAvailable) {
      setAvailableOrders([]);
      return;
    }

    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableOrders(pendingOrders);
    });

    return unsubscribe;
  }, [user, profile]);

  const acceptOrder = async (order: any) => {
    if (!user) return;
    setLoading(order.id);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'accepted',
        driverId: user.uid,
      });

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
      } catch (notifError) {
        console.error('Failed to notify user:', notifError);
      }

      alert('Order accepted successfully!');
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order. It might have been taken by another driver.');
    } finally {
      setLoading(null);
    }
  };

  if (profile?.role !== 'driver') {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p>Only drivers can view nearby orders.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-black text-blue-900 flex items-center">
            <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.447-1.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A2 2 0 0021 17.382V7.618a2 2 0 00-1.447-1.894L15 7m0 10V7" />
            </svg>
            Nearby Orders Map
          </h2>
          <p className="text-gray-500 mt-1">Find and accept orders in your immediate vicinity.</p>
        </div>
        <Link 
          to="/driver/orders" 
          className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 self-start"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Back to List
        </Link>
      </div>

      {!profile.isAvailable && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-bold">You are currently Offline. Toggle your status to Online in the dashboard to see and accept orders.</p>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <AvailableOrdersMap 
          orders={availableOrders} 
          onAccept={acceptOrder} 
          loadingId={loading} 
        />
        
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-gray-100 max-w-xs hidden md:block">
          <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Map Legend
          </h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
              <span>Your Current Location</span>
            </div>
            <div className="flex items-center gap-2">
              <img src="https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png" className="w-3 h-5" alt="Order" />
              <span>Available Order Pickup</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Available Now</p>
          <p className="text-2xl font-black text-blue-900">{availableOrders.length} Orders</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Status</p>
          <p className="text-2xl font-black text-green-900">{profile.isAvailable ? 'Online' : 'Offline'}</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">Map Zoom</p>
          <p className="text-2xl font-black text-orange-900">Auto-centered</p>
        </div>
      </div>
    </div>
  );
}
