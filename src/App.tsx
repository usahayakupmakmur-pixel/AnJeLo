/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Profile } from './components/Profile';
import { Orders } from './components/Orders';
import { OrderForm } from './components/OrderForm';
import { DriverOrders } from './components/DriverOrders';
import { OrderDetail } from './components/OrderDetail';
import { NearbyOrders } from './components/NearbyOrders';
import { AdminDrivers } from './components/AdminDrivers';
import { DriverDetail } from './components/DriverDetail';
import { AdminOrders } from './components/AdminOrders';
import { Wallet } from './components/Wallet';
import { NotificationBanner } from './components/NotificationBanner';
import { messaging, onMessage } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  useEffect(() => {
    const setupMessaging = async () => {
      const m = await messaging();
      if (m) {
        onMessage(m, (payload) => {
          console.log('Message received. ', payload);
          const event = new CustomEvent('app-notification', {
            detail: {
              title: payload.notification?.title || 'New Notification',
              body: payload.notification?.body || '',
              orderId: payload.data?.orderId
            }
          });
          window.dispatchEvent(event);
        });
      }
    };
    setupMessaging();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen pb-24 md:pb-0">
          <NotificationBanner />
          <header className="sticky top-0 z-40 glass border-b border-white/20 px-4 py-3">
            <div className="container mx-auto flex justify-between items-center">
              <Link to="/" className="text-2xl font-black tracking-tighter text-blue-600 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg">A</div>
                AnJeLo
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <NavLink to="/orders" label="Orders" />
                <NavLink to="/driver-orders" label="Driver" />
                <NavLink to="/profile" label="Profile" />
                <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:shadow-lg transition-all">Login</Link>
              </div>
            </div>
          </header>

          <main className="container mx-auto p-4 max-w-5xl">
            <Routes>
              <Route path="/" element={<Home onOrder={setSelectedService} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/driver-orders" element={<ProtectedRoute><DriverOrders /></ProtectedRoute>} />
              <Route path="/driver/nearby" element={<ProtectedRoute><NearbyOrders /></ProtectedRoute>} />
              <Route path="/admin/drivers" element={<ProtectedRoute><AdminDrivers /></ProtectedRoute>} />
              <Route path="/admin/drivers/:driverId" element={<ProtectedRoute><DriverDetail /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
              <Route path="/identity" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            </Routes>
          </main>

          <FloatingNav />

          <AnimatePresence>
            {selectedService && (
              <OrderForm serviceType={selectedService} onClose={() => setSelectedService(null)} />
            )}
          </AnimatePresence>
        </div>
      </Router>
    </AuthProvider>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
      {label}
    </Link>
  );
}

function FloatingNav() {
  const location = useLocation();
  const { user, profile } = useAuth();
  
  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="md:hidden floating-nav">
      <NavItem to="/" icon={<HomeIcon />} active={isActive('/')} />
      <NavItem to="/orders" icon={<OrdersIcon />} active={isActive('/orders')} />
      {profile?.role === 'driver' && (
        <>
          <NavItem to="/driver-orders" icon={<DriverIcon />} active={isActive('/driver-orders')} />
          <NavItem to="/driver/nearby" icon={<MapIcon />} active={isActive('/driver/nearby')} />
        </>
      )}
      <NavItem to="/identity" icon={<IdentityIcon />} active={isActive('/identity')} />
      <NavItem to="/profile" icon={<ProfileIcon />} active={isActive('/profile')} />
    </nav>
  );
}

function NavItem({ to, icon, active }: { to: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link to={to} className={`p-2 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'text-slate-400'}`}>
      {icon}
    </Link>
  );
}

// Icons
const HomeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const OrdersIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const DriverIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1-1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>;
const MapIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.447-1.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A2 2 0 0021 17.382V7.618a2 2 0 00-1.447-1.894L15 7m0 10V7" /></svg>;
const IdentityIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
const ProfileIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

function Home({ onOrder }: { onOrder: (service: string) => void }) {
  const { user, profile } = useAuth();
  
  return (
    <div className="space-y-10 py-6 px-1">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card bg-slate-900 text-white border-none overflow-hidden relative p-8 sm:p-12"
      >
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30 mb-6">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
            SwiftDrop v2.0
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight leading-none">
            Anything, <span className="text-blue-400">Delivered.</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
            Experience the next generation of local logistics. Fast, reliable, and transparent at your fingertips.
          </p>
          
          {user ? (
            <Link 
              to={profile?.role === 'driver' ? "/driver-orders" : "/orders"}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
            >
              Go to Dashboard
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
            >
              Get Started
            </Link>
          )}
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-12 hidden sm:block">
          <div className="w-24 h-24 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-4xl shadow-2xl rotate-12 animate-bounce duration-[3000ms]">
            📦
          </div>
        </div>
      </motion.div>

      {/* Service Selection */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Our Services</h2>
          <div className="h-px flex-1 bg-slate-100 mx-4"></div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ServiceCard title="Logistics" icon="📦" onOrder={onOrder} />
          <ServiceCard title="Ojek Online" icon="🏍️" onOrder={onOrder} />
          <ServiceCard title="Shopping" icon="🛒" onOrder={onOrder} />
          <ServiceCard title="School Pickup" icon="🎒" onOrder={onOrder} />
          <ServiceCard title="Trash Pickup" icon="♻️" onOrder={onOrder} />
          <ServiceCard title="Identity" icon="🆔" onOrder={() => window.location.href = '/identity'} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 px-2">
        <div className="glass p-4 rounded-3xl border border-white/40 text-center">
          <p className="text-xl font-black text-slate-900 leading-none mb-1">15m</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg Time</p>
        </div>
        <div className="glass p-4 rounded-3xl border border-white/40 text-center">
          <p className="text-xl font-black text-slate-900 leading-none mb-1">4.9</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rating</p>
        </div>
        <div className="glass p-4 rounded-3xl border border-white/40 text-center">
          <p className="text-xl font-black text-slate-900 leading-none mb-1">24/7</p>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Support</p>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ title, icon, onOrder }: { title: string; icon: string; onOrder: (service: string) => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOrder(title)}
      className="glass-card group text-left p-6 flex flex-col items-start gap-4 hover:border-blue-200 transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900 leading-none mb-1">{title}</h3>
        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Order Now</p>
      </div>
    </motion.button>
  );
}

