import React, { useEffect, useState } from 'react';
import { db, collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from '../firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChatRoom } from './ChatRoom';
import { calculateAverageSpeed, calculateETA } from '../lib/geoUtils';

export function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showChatId, setShowChatId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSuccess, setShowSuccess] = useState(false);
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('session_id')) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort by creation date
      ordersData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(ordersData);
    });
    return unsubscribe;
  }, [user]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    if (showChatId === orderId) setShowChatId(null);
  };

  const toggleChat = (orderId: string) => {
    setShowChatId(showChatId === orderId ? null : orderId);
  };

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' ? true : order.status === statusFilter
  );

  const activeOrders = filteredOrders.filter(order => 
    ['pending_payment', 'pending', 'assigned', 'accepted', 'in-progress'].includes(order.status)
  );

  const historyOrders = filteredOrders.filter(order => 
    ['completed', 'cancelled'].includes(order.status)
  );

  const filterOptions = ['all', 'pending_payment', 'pending', 'assigned', 'accepted', 'in-progress', 'completed', 'cancelled'];

  const getStatusCount = (status: string) => {
    if (status === 'all') return orders.length;
    return orders.filter(o => o.status === status).length;
  };

  const getETA = (order: any) => {
    if (!order.driverLocation || !['accepted', 'in-progress'].includes(order.status)) return null;
    
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
      label: order.status === 'accepted' ? 'to Pickup' : 'to Destination'
    };
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl font-black flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Payment Successful! Your order is now being processed.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Your Orders</h2>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                statusFilter === status 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' 
                  : 'bg-white/50 text-slate-500 border-white/20 hover:bg-white/80'
              }`}
            >
              <span>{status}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${
                statusFilter === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {getStatusCount(status)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-10">
        {(statusFilter === 'all' || ['pending_payment', 'pending', 'assigned', 'accepted', 'in-progress'].includes(statusFilter)) && (
          <section>
            <h3 className="text-sm font-black mb-4 text-slate-400 uppercase tracking-widest flex items-center px-2">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
              Active Orders
            </h3>
            {renderOrderList(activeOrders, `No active ${statusFilter === 'all' ? '' : statusFilter} orders found.`)}
          </section>
        )}

        {(statusFilter === 'all' || ['completed', 'cancelled'].includes(statusFilter)) && (
          <section>
            <h3 className="text-sm font-black mb-4 text-slate-400 uppercase tracking-widest flex items-center px-2">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mr-2"></span>
              Order History
            </h3>
            {renderOrderList(historyOrders, `No ${statusFilter === 'all' ? '' : statusFilter} orders in history.`)}
          </section>
        )}
      </div>
    </div>
  );
}

const renderOrderList = (orderList: any[], emptyMessage: string) => {
  if (orderList.length === 0) {
    return (
      <div className="glass-card text-center py-12 border-dashed border-slate-200">
        <p className="text-slate-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orderList.map(order => (
        <div key={order.id}>
          <OrderCard order={order} />
        </div>
      ))}
    </div>
  );
};

function OrderCard({ order }: { order: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, profile } = useAuth();

  const handlePayNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  const getETA = (order: any) => {
    if (!order.driverLocation || !['accepted', 'in-progress'].includes(order.status)) return null;
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
      label: order.status === 'accepted' ? 'to Pickup' : 'to Destination'
    };
  };

  const eta = getETA(order);

  return (
    <div className="mobile-card p-0 overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 text-left flex justify-between items-center hover:bg-white/40 transition-colors"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-lg tracking-tight">{order.serviceType}</span>
            <span className="text-[10px] font-bold text-slate-400">
              {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
              order.status === 'pending_payment' ? 'bg-rose-100 text-rose-700' :
              order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              order.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
              order.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
              order.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
            {order.driverLocation && (order.status === 'accepted' || order.status === 'in-progress') && (
              <span className="flex items-center text-[9px] font-black text-blue-600 animate-pulse">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-1"></span>
                LIVE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-blue-600">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 border-t border-white/20 bg-white/30"
          >
            <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-4">
                <LocationPoint label="Pickup" address={order.pickup} />
                <LocationPoint label="Destination" address={order.destination} />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-white/50 border border-white/20">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Price</span>
                  <span className="text-sm font-black text-blue-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                  </span>
                </div>
                
                {eta && (
                  <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">ETA {eta.label}</p>
                      <p className="text-xl font-black leading-none mt-1">{eta.minutes} min</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {order.driverId && order.status !== 'completed' && order.status !== 'cancelled' && (
              <div className="mt-5 pt-5 border-t border-white/20">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className="w-full py-3 rounded-2xl bg-white/60 text-blue-600 font-black text-xs flex items-center justify-center gap-2 hover:bg-white/80 transition-all border border-white/40"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  {showChat ? 'Hide Chat' : 'Chat with Driver'}
                </button>
                <AnimatePresence>
                  {showChat && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <ChatRoom 
                        orderId={order.id} 
                        currentUser={{ uid: user.uid, displayName: profile?.name }} 
                        onClose={() => setShowChat(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="mt-5 pt-5 border-t border-white/20 flex gap-3">
              {order.status === 'pending_payment' && (
                <button
                  onClick={handlePayNow}
                  disabled={isProcessing}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                >
                  {isProcessing ? 'Processing...' : 'Pay Now'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </button>
              )}
              
              <Link 
                to={`/orders/${order.id}`}
                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Details
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </Link>
              
              {(order.status === 'pending_payment' || order.status === 'pending' || order.status === 'accepted') && (
                <button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="flex-1 py-3 rounded-2xl bg-rose-50 text-rose-600 font-black text-xs border border-rose-100 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                >
                  {isCancelling ? '...' : 'Cancel'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LocationPoint({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center gap-1">
        <div className={`w-2.5 h-2.5 rounded-full ${label === 'Pickup' ? 'bg-blue-600' : 'bg-emerald-500'} shadow-sm`}></div>
        {label === 'Pickup' && <div className="w-0.5 h-full bg-slate-200 rounded-full"></div>}
      </div>
      <div className="pb-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-800 line-clamp-1">{address}</p>
      </div>
    </div>
  );
}
