import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from './AuthContext';
import { db, collection, addDoc, serverTimestamp } from '../firebase';

export function OrderForm({ serviceType, onClose }: { serviceType: string; onClose: () => void }) {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Simple distance-based pricing logic
  const calculatePrice = () => {
    // Base rates for different services
    const baseRates: Record<string, number> = {
      'Ride': 10000,
      'Delivery': 15000,
      'Food': 12000,
      'Identity': 50000, // Premium identity service
    };
    
    const base = baseRates[serviceType] || 10000;
    // Mock distance between 1 and 10 km
    const distance = Math.floor(Math.random() * 9) + 1;
    const perKmRate = 5000;
    
    return base + (distance * perKmRate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);

    try {
      const calculatedPrice = calculatePrice();
      
      // Mock coordinates near Jakarta for demo purposes
      const pickupCoords = {
        lat: -6.2088 + (Math.random() - 0.5) * 0.05,
        lng: 106.8456 + (Math.random() - 0.5) * 0.05,
      };
      const destinationCoords = {
        lat: -6.2088 + (Math.random() - 0.5) * 0.05,
        lng: 106.8456 + (Math.random() - 0.5) * 0.05,
      };

      // 1. Create the order in Firestore first with 'pending_payment' status
      const docRef = await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        serviceType,
        pickup,
        destination,
        pickupCoords,
        destinationCoords,
        price: calculatedPrice,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
      });

      // 2. Create Stripe Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: docRef.id,
          amount: calculatedPrice, // IDR amount
          serviceType,
        }),
      });

      const { url } = await response.json();
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('Failed to create payment session');
      }
    } catch (error) {
      console.error('Error creating order/payment:', error);
      setIsProcessing(false);
      alert('Failed to process payment. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">New {serviceType}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Pickup Location</label>
            <input
              type="text"
              placeholder="e.g. Grand Indonesia"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Destination</label>
            <input
              type="text"
              placeholder="e.g. Monas"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Estimated Fare</p>
                <p className="text-blue-600 font-black">Rp {calculatePrice().toLocaleString()}</p>
              </div>
            </div>
            <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest">Distance: ~5km</span>
          </div>

          <button 
            type="submit" 
            disabled={isProcessing}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay & Place Order
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
