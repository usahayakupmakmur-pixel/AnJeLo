import React, { useState, useMemo } from 'react';

interface EarningsReportProps {
  orders: any[];
}

export function EarningsReport({ orders }: EarningsReportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (!order.completedAt) return false;
      const completedDate = new Date(order.completedAt).toISOString().split('T')[0];
      const isAfterStart = !startDate || completedDate >= startDate;
      const isBeforeEnd = !endDate || completedDate <= endDate;
      return isAfterStart && isBeforeEnd;
    });
  }, [orders, startDate, endDate]);

  const totalEarnings = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + (order.price || 0), 0);
  }, [filteredOrders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
        <h3 className="text-xl font-bold flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Earnings Report
        </h3>
        <p className="text-green-100 text-sm mt-1 opacity-80">Track your performance and revenue</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total Earnings</p>
            <p className="text-2xl font-black text-green-700">{formatCurrency(totalEarnings)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Orders Completed</p>
            <p className="text-2xl font-black text-gray-800">{filteredOrders.length}</p>
          </div>
        </div>

        {filteredOrders.length > 0 && (
          <div className="mt-6">
             <p className="text-xs font-bold text-gray-400 uppercase mb-2">Activity in Period</p>
             <div className="max-h-40 overflow-y-auto space-y-2">
                {filteredOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex justify-between items-center text-sm p-2 bg-white border rounded shadow-sm">
                    <span className="font-medium">{order.serviceType}</span>
                    <span className="text-green-600 font-bold">{formatCurrency(order.price)}</span>
                  </div>
                ))}
                {filteredOrders.length > 5 && (
                  <p className="text-center text-xs text-gray-400 py-1 italic">And {filteredOrders.length - 5} more...</p>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
