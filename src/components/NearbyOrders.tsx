import React from 'react';
import { DriverNearbyMap } from './DriverNearbyMap';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';

export function NearbyOrders() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 py-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-4">
          <Link 
            to="/driver-orders" 
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-slate-600 hover:bg-white transition-all active:scale-95 shadow-sm border-white/40"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <MapIcon className="text-blue-600" size={32} />
              Nearby Orders
            </h1>
            <p className="text-sm font-medium text-slate-500">Find and accept orders in your immediate vicinity.</p>
          </div>
        </div>
      </div>

      <div className="px-2">
        <DriverNearbyMap />
      </div>
    </motion.div>
  );
}
