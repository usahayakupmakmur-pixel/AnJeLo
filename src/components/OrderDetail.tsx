import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, onSnapshot } from '../firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { TrackingMap } from './TrackingMap';
import { RatingForm } from './RatingForm';
import { MovementLog } from './MovementLog';
import { ChatRoom } from './ChatRoom';
import { calculateAverageSpeed, calculateETA, getDistance } from '../lib/geoUtils';

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.price,
          serviceType: order.serviceType
        }),
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!orderId || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Basic security check: user must be the owner, the driver, or an admin
        if (data.userId === user.uid || data.driverId === user.uid || profile?.role === 'admin') {
          setOrder({ id: docSnap.id, ...data });
        } else {
          setError('You do not have permission to view this order.');
        }
      } else {
        setError('Order not found.');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching order:', err);
      setError('Failed to load order details.');
      setLoading(false);
    });

    return unsubscribe;
  }, [orderId, user, profile]);

  const getETA = () => {
    if (!order || !order.driverLocation || !['accepted', 'in-progress'].includes(order.status)) return null;
    
    const speed = calculateAverageSpeed(order.locationHistory);
    const targetCoords = order.status === 'accepted' ? order.pickupCoords : order.destinationCoords;
    
    if (!targetCoords) return null;
    
    const etaMinutes = calculateETA(
      order.driverLocation.lat, 
      order.driverLocation.lng, 
      targetCoords.lat, 
      targetCoords.lng, 
      speed
    );
    
    return {
      minutes: etaMinutes,
      label: order.status === 'accepted' ? 'to Pickup' : 'to Destination',
      speed: Math.round(speed)
    };
  };

  const eta = getETA();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto pb-24 px-4 sm:px-0"
    >
      {/* Real-time Tracking Map */}
      {(order.pickupCoords || order.destinationCoords || order.driverLocation) && (
        <div className="mb-8 rounded-[2.5rem] overflow-hidden border border-white/40 shadow-2xl h-80 relative">
          <TrackingMap 
            pickup={order.pickupCoords}
            destination={order.destinationCoords}
            driver={order.driverLocation}
            history={order.locationHistory}
            className="h-full w-full"
          />
          <div className="absolute top-4 right-4 glass px-3 py-1.5 rounded-xl text-[10px] text-slate-900 font-black uppercase tracking-widest border border-white/50 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Live Tracking
          </div>
        </div>
      )}

      <div className="glass-card mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-3xl shadow-inner border border-blue-100">
              {order.serviceType === 'Ride' ? '🚗' : order.serviceType === 'Courier' ? '📦' : '🍽️'}
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{order.serviceType}</h2>
              <p className="text-slate-400 mt-1 font-mono text-xs uppercase tracking-wider">Order ID: {order.id.slice(-12)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${
              order.status === 'pending_payment' ? 'bg-rose-50 text-rose-700 border-rose-100' :
              order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
              order.status === 'assigned' ? 'bg-blue-50 text-blue-700 border-blue-100' :
              order.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-100' :
              order.status === 'in-progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
              order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' :
              'bg-slate-50 text-slate-600 border-slate-100'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
            {order.driverId && (
              <button 
                onClick={() => setShowChat(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Chat {profile?.role === 'driver' ? 'Customer' : 'Driver'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              Route Details
            </h3>
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6 relative">
              <div className="absolute left-7.5 top-12 bottom-12 w-0.5 bg-slate-100 rounded-full"></div>
              <div className="flex items-start gap-4 relative">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 border-2 border-white shadow-sm z-10"></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup</p>
                  <p className="text-sm font-bold text-slate-800">{order.pickup}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 relative">
                <div className="w-3 h-3 rounded-full bg-orange-500 mt-1.5 border-2 border-white shadow-sm z-10"></div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination</p>
                  <p className="text-sm font-bold text-slate-800">{order.destination}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
              Order Summary
            </h3>
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Price</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tight">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                  💰
                </div>
              </div>

              {order.status === 'pending_payment' && user.uid === order.userId && (
                <button
                  onClick={handlePayNow}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200"
                >
                  {isProcessing ? 'Processing...' : 'Complete Payment Now'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              )}
              
              {eta && (
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Estimated Arrival</p>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-blue-600 leading-none">{eta.minutes}</span>
                      <span className="text-xs font-black text-blue-400 uppercase tracking-widest pb-0.5">min {eta.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Speed</p>
                    <p className="text-sm font-black text-slate-700">{eta.speed} km/h</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="border-t border-slate-100 pt-8 mb-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
            Involved Parties
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-blue-100">👤</div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Customer</p>
                <p className="text-xs font-mono text-blue-900 truncate">{order.userId}</p>
              </div>
            </div>
            <div className="p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-emerald-100">🏎️</div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Driver</p>
                <p className="text-xs font-mono text-emerald-900 truncate">{order.driverId || 'Awaiting Assignment'}</p>
              </div>
            </div>
          </div>
        </section>

        {order.locationHistory && order.locationHistory.length > 0 && (
          <section className="border-t border-slate-100 pt-8 mb-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
              Movement History
            </h3>
            <div className="bg-slate-50/30 rounded-3xl p-4 border border-slate-100">
              <MovementLog history={order.locationHistory} />
            </div>
          </section>
        )}

        {/* Rating Section */}
        {order.status === 'completed' && (
          <section className="border-t border-slate-100 pt-8 mb-8">
            {order.rating ? (
              <div className="bg-amber-50/50 border border-amber-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <h3 className="text-xl font-black text-amber-900 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Driver Rating
                </h3>
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={`text-3xl ${star <= order.rating.score ? 'text-amber-500' : 'text-slate-200'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="h-8 w-px bg-amber-200"></div>
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest">
                    {new Date(order.rating.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {order.rating.comment && (
                  <div className="bg-white/80 p-6 rounded-2xl border border-amber-100 shadow-sm italic text-slate-700 text-sm leading-relaxed">
                    "{order.rating.comment}"
                  </div>
                )}
              </div>
            ) : (
              user.uid === order.userId && (
                <div className="glass p-8 rounded-[2rem] border border-white/40 shadow-xl">
                  <RatingForm 
                    orderId={order.id}
                    userId={user.uid}
                    driverId={order.driverId}
                    onSuccess={() => {
                      alert('Thank you for your rating!');
                    }}
                  />
                </div>
              )
            )}
          </section>
        )}

        <div className="mt-10 flex justify-center">
          <button 
            onClick={() => navigate(-1)}
            className="px-8 py-3 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all border border-white/40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Hub
          </button>
        </div>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md"
            >
              <ChatRoom 
                orderId={order.id} 
                currentUser={{ uid: user.uid, displayName: profile?.name }} 
                onClose={() => setShowChat(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
