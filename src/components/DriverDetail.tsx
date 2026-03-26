import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, onSnapshot } from '../firebase';
import { useAuth } from './AuthContext';
import { motion } from 'motion/react';
import { TrackingMap } from './TrackingMap';

export function DriverDetail() {
  const { driverId } = useParams<{ driverId: string }>();
  const [driver, setDriver] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (!driverId || profile?.role !== 'admin') return;

    const fetchDriverData = async () => {
      try {
        const driverDoc = await getDoc(doc(db, 'users', driverId));
        if (driverDoc.exists()) {
          setDriver({ id: driverDoc.id, ...driverDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching driver:', error);
      }
    };

    fetchDriverData();

    // Fetch driver's order history
    const ordersQ = query(collection(db, 'orders'), where('driverId', '==', driverId));
    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setOrders(ordersData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
    });

    // Fetch driver's ratings
    const ratingsQ = query(collection(db, 'ratings'), where('driverId', '==', driverId));
    const unsubscribeRatings = onSnapshot(ratingsQ, (snapshot) => {
      const ratingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRatings(ratingsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeRatings();
    };
  }, [driverId, profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p>Only admins can view driver details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading driver details...</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-600">Driver Not Found</h2>
        <Link to="/admin/drivers" className="text-blue-600 hover:underline">Back to Driver List</Link>
      </div>
    );
  }

  const avgRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length).toFixed(1)
    : 'N/A';

  const activeOrder = orders.find(o => o.status === 'accepted' || o.status === 'in-progress');

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow space-y-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
            {driver.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{driver.name}</h2>
            <p className="text-gray-500">{driver.email}</p>
            <div className="flex items-center mt-1">
              <span className={`w-2 h-2 rounded-full mr-1.5 ${driver.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {driver.isAvailable ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end text-yellow-500 mb-1">
            <span className="text-2xl font-black mr-1">{avgRating}</span>
            <span className="text-xl">★</span>
          </div>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{ratings.length} Ratings</p>
        </div>
      </div>

      {/* Recent Activity Map */}
      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.447-1.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A2 2 0 0021 17.382V7.618a2 2 0 00-1.447-1.894L15 7m0 10V7" />
          </svg>
          Recent Activity Map
        </h3>
        <div className="bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          <TrackingMap 
            driver={activeOrder?.driverLocation || driver.lastLocation}
            pickup={activeOrder?.pickupCoords}
            destination={activeOrder?.destinationCoords}
            history={activeOrder?.locationHistory}
            className="h-64 w-full"
          />
        </div>
        {!activeOrder && !driver.lastLocation && (
          <p className="text-xs text-gray-400 mt-2 italic text-center">No recent location data available for this driver.</p>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order History */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Order History
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {orders.map((order) => (
              <div key={order.id} className="p-3 border rounded-lg bg-gray-50 hover:bg-white transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-gray-800">{order.serviceType}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">From: {order.pickup}</p>
                <p className="text-xs text-gray-500 truncate">To: {order.destination}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-gray-400 font-mono">{order.id}</span>
                  <span className="text-xs font-bold text-green-700">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-gray-500 italic text-sm">No orders found for this driver.</p>
            )}
          </div>
        </section>

        {/* Ratings & Reviews */}
        <section>
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Ratings & Reviews
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {ratings.map((rating) => (
              <div key={rating.id} className="p-3 border rounded-lg bg-yellow-50/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-sm">{i < rating.score ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(rating.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {rating.comment && (
                  <p className="text-sm text-gray-700 italic">"{rating.comment}"</p>
                )}
                <p className="text-[10px] text-gray-400 mt-2 font-mono">Order: {rating.orderId}</p>
              </div>
            ))}
            {ratings.length === 0 && (
              <p className="text-gray-500 italic text-sm">No ratings yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="pt-6 border-t flex justify-center">
        <Link 
          to="/admin/drivers"
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-50 transition-colors"
        >
          Back to Driver List
        </Link>
      </div>
    </div>
  );
}
