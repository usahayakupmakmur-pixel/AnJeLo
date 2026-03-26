import React, { useEffect, useState } from 'react';
import { db, collection, query, where, onSnapshot } from '../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { motion } from 'motion/react';

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const driversData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDrivers(driversData);
    });

    return unsubscribe;
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p>Only admins can view the driver list.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        All Drivers
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drivers.map((driver) => (
          <motion.div 
            key={driver.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl p-4 hover:shadow-md transition-shadow bg-gray-50 flex justify-between items-center"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                {driver.name?.charAt(0) || 'D'}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{driver.name}</h3>
                <p className="text-xs text-gray-500">{driver.email}</p>
                <div className="flex items-center mt-1">
                  <span className={`w-2 h-2 rounded-full mr-1.5 ${driver.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {driver.isAvailable ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <Link 
              to={`/admin/drivers/${driver.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              View Details
            </Link>
          </motion.div>
        ))}
      </div>

      {drivers.length === 0 && (
        <p className="text-center text-gray-500 py-10 italic">No drivers found in the system.</p>
      )}
    </div>
  );
}
