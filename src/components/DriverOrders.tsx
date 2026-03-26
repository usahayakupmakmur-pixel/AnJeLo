import React, { useEffect, useState } from 'react';
import { db, collection, query, where, onSnapshot, updateDoc, doc, arrayUnion } from '../firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { TrackingMap } from './TrackingMap';
import { EarningsReport } from './EarningsReport';
import { MovementLog } from './MovementLog';
import { ChatRoom } from './ChatRoom';
import { AvailableOrdersMap } from './AvailableOrdersMap';

export function DriverOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showLogId, setShowLogId] = useState<string | null>(null);
  const [showChatId, setShowChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'history'>('available');
  const { user, profile } = useAuth();
  const [isAvailable, setIsAvailable] = useState<boolean>(profile?.isAvailable ?? true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState<string | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [assigningTo, setAssigningTo] = useState<{ [orderId: string]: string }>({});

  useEffect(() => {
    if (profile) {
      setIsAvailable(profile.isAvailable ?? true);
    }
  }, [profile]);

  // Real-time location tracking for active orders
  useEffect(() => {
    if (!user || !profile || profile.role !== 'driver') return;

    const activeOrder = orders.find(o => o.status === 'accepted' || o.status === 'in-progress');
    if (!activeOrder) return;

    let watchId: number;

    const updateLocation = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const timestamp = new Date().toISOString();
      try {
        await updateDoc(doc(db, 'orders', activeOrder.id), {
          driverLocation: {
            lat: latitude,
            lng: longitude,
            updatedAt: timestamp
          },
          locationHistory: arrayUnion({
            lat: latitude,
            lng: longitude,
            timestamp: timestamp
          })
        });
      } catch (err) {
        console.error('Failed to update driver location:', err);
      }
    };

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        (err) => console.error('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, profile, orders]);

  useEffect(() => {
    if (!user || !profile) return;
    
    let q;
    if (profile.role === 'admin') {
      // Admins see all active and pending orders
      q = query(
        collection(db, 'orders'), 
        where('status', 'in', ['pending', 'assigned', 'accepted', 'in-progress'])
      );
    } else if (profile.role === 'driver') {
      // Drivers see their own active orders
      q = query(
        collection(db, 'orders'), 
        where('driverId', '==', user.uid),
        where('status', 'in', ['assigned', 'accepted', 'in-progress'])
      );
    } else {
      // Regular users see nothing in the driver dashboard
      setOrders([]);
      return;
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
    });
    
    // Fetch completed orders
    let completedQ;
    if (profile.role === 'admin') {
      completedQ = query(collection(db, 'orders'), where('status', '==', 'completed'));
    } else {
      completedQ = query(collection(db, 'orders'), where('driverId', '==', user.uid), where('status', '==', 'completed'));
    }
    const unsubscribeCompleted = onSnapshot(completedQ, (snapshot) => {
      const completedData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompletedOrders(completedData);
    });
    
    return () => {
      unsubscribe();
      unsubscribeCompleted();
    };
  }, [user, profile]);

  // Fetch available orders (pending) for drivers
  useEffect(() => {
    if (!user || !profile || profile.role !== 'driver' || !isAvailable) {
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

  // Fetch available drivers for admin assignment
  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;

    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'driver'),
      where('isAvailable', '==', true)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableDrivers(drivers);
    });

    return unsubscribe;
  }, [user, profile]);

  if (profile && profile.role !== 'driver' && profile.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p>You do not have permission to view the Driver Dashboard.</p>
      </div>
    );
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    if (showLogId === orderId) setShowLogId(null);
  };

  const toggleLog = (orderId: string) => {
    setShowLogId(showLogId === orderId ? null : orderId);
  };

  const toggleChat = (orderId: string) => {
    setShowChatId(showChatId === orderId ? null : orderId);
  };

  const toggleAvailability = async () => {
    if (!user) return;
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isAvailable: newStatus
      });
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!newStatus); // Rollback
    }
  };

  const assignOrder = async (orderId: string) => {
    const driverId = assigningTo[orderId];
    if (!driverId) return;
    
    setLoading(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'assigned',
        driverId: driverId
      });
      alert('Order assigned successfully!');
    } catch (error) {
      console.error('Error assigning order:', error);
      alert('Failed to assign order.');
    } finally {
      setLoading(null);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setLoading(orderId);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'orders', orderId), updates);
      alert(`Order updated to ${newStatus}!`);
    } catch (error) {
      console.error('Error updating order status:', error);
    } finally {
      setLoading(null);
    }
  };

  const acceptOrder = async (order: any) => {
    if (!user) return;
    setLoading(order.id);
    try {
      // 1. Update Firestore
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'accepted',
        driverId: user.uid,
      });

      // 2. Notify the user
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

  return (
    <div className="max-w-4xl mx-auto pb-32 px-4 sm:px-0 min-h-screen">
      {/* Header / Status Bar */}
      <div className="sticky top-0 z-40 pt-4 pb-2 bg-slate-50/10 backdrop-blur-sm -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between glass px-6 py-4 rounded-3xl border border-white/40 shadow-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`}></div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-none">Driver Hub</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                {isAvailable ? 'Online & Ready' : 'Currently Offline'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleAvailability}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none ${
              isAvailable ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                isAvailable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'available' && profile?.role === 'driver' && (
          <motion.section 
            key="available"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6 mt-6"
          >
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Available</h2>
              <div className="flex glass p-1 rounded-2xl border border-white/40">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewMode === 'list' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'
                  }`}
                >
                  List
                </button>
                <button 
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewMode === 'map' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'
                  }`}
                >
                  Map
                </button>
              </div>
            </div>

            {availableOrders.length === 0 ? (
              <div className="glass p-12 rounded-[2.5rem] text-center border border-white/20">
                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl opacity-50">📭</div>
                <p className="text-slate-400 font-medium italic">No orders nearby right now.</p>
              </div>
            ) : viewMode === 'map' ? (
              <div className="rounded-[2.5rem] overflow-hidden border border-white/20 shadow-2xl h-[60vh]">
                <AvailableOrdersMap 
                  orders={availableOrders} 
                  onAccept={acceptOrder} 
                  loadingId={loading} 
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableOrders.map(order => (
                  <motion.div 
                    key={order.id} 
                    layout
                    className="glass-card border border-white/40 hover:bg-white/90 transition-all group active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-2xl shadow-inner">
                          {order.serviceType === 'Ride' ? '🚗' : order.serviceType === 'Courier' ? '📦' : '🍽️'}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-lg leading-tight">{order.serviceType}</h3>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{order.id.slice(-8).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-6 relative">
                      <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-slate-100 rounded-full"></div>
                      <div className="flex items-start gap-4 relative">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.5)] z-10 border-2 border-white"></div>
                        <div className="flex-grow min-w-0">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Pickup</p>
                          <p className="text-sm text-slate-700 font-medium truncate">{order.pickup}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 relative">
                        <div className="w-3 h-3 rounded-full bg-orange-500 mt-1.5 shadow-[0_0_8px_rgba(249,115,22,0.5)] z-10 border-2 border-white"></div>
                        <div className="flex-grow min-w-0">
                          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Destination</p>
                          <p className="text-sm text-slate-700 font-medium truncate">{order.destination}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => acceptOrder(order)}
                      disabled={loading === order.id}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                    >
                      {loading === order.id ? 'Processing...' : 'Accept Order'}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {activeTab === 'active' && (
          <motion.section 
            key="active"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6 mt-6"
          >
            <h2 className="text-2xl font-black text-slate-900 tracking-tight px-2">Active Orders</h2>
            
            {orders.length === 0 ? (
              <div className="glass p-12 rounded-[2.5rem] text-center border border-white/20">
                <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-2xl opacity-50">📋</div>
                <p className="text-slate-400 font-medium italic">No active orders assigned.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <motion.div 
                    key={order.id} 
                    layout
                    className="glass-card border border-white/40 shadow-xl overflow-hidden"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                          {order.serviceType === 'Ride' ? '🚗' : order.serviceType === 'Courier' ? '📦' : '🍽️'}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-lg leading-tight">{order.serviceType}</h3>
                          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{order.id.slice(-8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                          order.status === 'pending_payment' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          order.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          order.status === 'assigned' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          order.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-100' :
                          order.status === 'in-progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <button 
                          onClick={() => toggleExpand(order.id)}
                          className="w-10 h-10 rounded-2xl bg-white/50 flex items-center justify-center text-slate-400 hover:bg-white transition-colors border border-white/40"
                        >
                          <svg className={`w-5 h-5 transition-transform duration-300 ${expandedOrderId === order.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-6 bg-white/30 p-4 rounded-2xl border border-white/40">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Total Earnings</p>
                        <p className="text-xl font-black text-slate-900">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {order.status === 'assigned' && (
                          <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="bg-green-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-500 shadow-lg shadow-green-600/20">Accept</button>
                        )}
                        {order.status === 'accepted' && (
                          <button onClick={() => updateOrderStatus(order.id, 'in-progress')} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-lg shadow-blue-600/20">Start</button>
                        )}
                        {order.status === 'in-progress' && (
                          <button onClick={() => updateOrderStatus(order.id, 'completed')} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black shadow-lg">Finish</button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedOrderId === order.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-6"
                        >
                          {/* Live Map */}
                          <div className="rounded-3xl overflow-hidden border border-white/40 shadow-inner h-56 relative">
                            <TrackingMap 
                              pickup={order.pickupCoords}
                              destination={order.destinationCoords}
                              driver={order.driverLocation}
                              history={order.locationHistory}
                              className="h-full w-full"
                            />
                            <div className="absolute top-3 right-3 glass px-3 py-1.5 rounded-xl text-[9px] text-slate-900 font-black uppercase tracking-widest border border-white/50 flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                              Live Tracking
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-4 bg-white/20 p-4 rounded-2xl border border-white/30">
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 border-2 border-white shadow-sm"></div>
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Pickup</p>
                                  <p className="text-sm text-slate-700 font-medium">{order.pickup}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 border-2 border-white shadow-sm"></div>
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Destination</p>
                                  <p className="text-sm text-slate-700 font-medium">{order.destination}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <button onClick={() => toggleChat(order.id)} className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-white transition-all border border-white/50 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                {showChatId === order.id ? 'Close Chat' : 'Chat Customer'}
                              </button>
                              <Link to={`/orders/${order.id}`} className="flex-1 py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-white transition-all border border-white/50 flex items-center justify-center gap-2">
                                Full Details
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </Link>
                            </div>
                          </div>

                          <AnimatePresence>
                            {showChatId === order.id && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="rounded-3xl overflow-hidden border border-white/40 shadow-2xl">
                                <ChatRoom orderId={order.id} currentUser={{ uid: user.uid, displayName: profile?.name }} onClose={() => setShowChatId(null)} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {activeTab === 'history' && (
          <motion.section 
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6 mt-6"
          >
            <div className="glass p-8 rounded-[2.5rem] border border-white/40 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <EarningsReport orders={completedOrders} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight px-2">Order History</h2>
              <div className="glass rounded-[2.5rem] border border-white/40 overflow-hidden shadow-xl">
                {completedOrders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 italic font-medium">No completed orders yet.</div>
                ) : (
                  <ul className="divide-y divide-slate-100/50">
                    {completedOrders.map(order => (
                      <li key={order.id} className="p-6 hover:bg-white/60 transition-all group">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-2xl shadow-sm border border-white/60">
                              {order.serviceType === 'Ride' ? '🚗' : order.serviceType === 'Courier' ? '📦' : '🍽️'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">{order.serviceType}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider">{order.id.slice(-8)}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  {order.completedAt ? new Date(order.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-900 text-xl tracking-tight">
                              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                            </p>
                            <Link to={`/orders/${order.id}`} className="inline-block mt-2 text-blue-600 text-[9px] font-black uppercase tracking-widest hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">Details</Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50">
        <div className="glass rounded-[2rem] p-2 border border-white/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('available')}
            className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all gap-1 ${
              activeTab === 'available' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Available</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all gap-1 ${
              activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              {orders.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all gap-1 ${
              activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">History</span>
          </button>
        </div>
      </div>
    </div>
  );
}
