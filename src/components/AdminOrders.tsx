import React, { useEffect, useState } from 'react';
import { db, collection, query, onSnapshot, doc, updateDoc, where, getDocs } from '../firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState<string | null>(null);
  const [assigningTo, setAssigningTo] = useState<{ [orderId: string]: string }>({});
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    // Fetch all orders
    const q = query(collection(db, 'orders'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort by createdAt descending
      setOrders(ordersData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
    });

    // Fetch available drivers for assignment
    const driversQ = query(
      collection(db, 'users'), 
      where('role', '==', 'driver'),
      where('isAvailable', '==', true)
    );
    const unsubscribeDrivers = onSnapshot(driversQ, (snapshot) => {
      const driversData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driversData);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeDrivers();
    };
  }, [profile]);

  const handleAssign = async (orderId: string) => {
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

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setLoading(orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled'
      });
      alert('Order cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order.');
    } finally {
      setLoading(null);
    }
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p>Only admins can view all orders.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-black text-gray-900 flex items-center">
          <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Global Order Management
        </h2>
        
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {['all', 'pending_payment', 'pending', 'assigned', 'accepted', 'in-progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                filterStatus === status 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="py-4 px-2 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
              <th className="py-4 px-2 text-xs font-black text-gray-400 uppercase tracking-widest">Service</th>
              <th className="py-4 px-2 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="py-4 px-2 text-xs font-black text-gray-400 uppercase tracking-widest">Price</th>
              <th className="py-4 px-2 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <motion.tr 
                  key={order.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-2">
                    <Link to={`/orders/${order.id}`} className="text-[10px] font-mono text-blue-600 hover:underline">
                      {order.id.substring(0, 8)}...
                    </Link>
                  </td>
                  <td className="py-4 px-2">
                    <span className="font-bold text-gray-800 text-sm">{order.serviceType}</span>
                    <p className="text-[9px] text-gray-400 truncate max-w-[120px]">{order.pickup}</p>
                  </td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      order.status === 'pending_payment' ? 'bg-rose-100 text-rose-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-2 font-bold text-gray-900 text-xs">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.price || 0)}
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center justify-end space-x-2">
                      {order.status === 'pending' && (
                        <div className="flex items-center space-x-1">
                          <select 
                            className="text-[9px] p-1 border rounded bg-white max-w-[100px]"
                            value={assigningTo[order.id] || ''}
                            onChange={(e) => setAssigningTo({ ...assigningTo, [order.id]: e.target.value })}
                          >
                            <option value="">Assign</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => handleAssign(order.id)}
                            disabled={!assigningTo[order.id] || loading === order.id}
                            className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            title="Assign"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        </div>
                      )}
                      
                      {['pending_payment', 'pending', 'assigned', 'accepted', 'in-progress'].includes(order.status) && (
                        <button 
                          onClick={() => handleCancel(order.id)}
                          disabled={loading === order.id}
                          className="p-1.5 bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50"
                          title="Cancel Order"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      
                      <Link 
                        to={`/orders/${order.id}`}
                        className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        title="View Details"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 italic">No orders found matching this status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
