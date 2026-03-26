import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db, doc, updateDoc, messaging, getToken } from '../firebase';
import { useNavigate } from 'react-router-dom';
import * as firebaseConfig from '../firebase-applet-config.json';
import { User as UserIcon } from 'lucide-react';

export function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(Notification.permission);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const registerForNotifications = async () => {
    if (!user) return;
    setIsRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      
      if (permission === 'granted') {
        const m = await messaging();
        if (m) {
          const token = await getToken(m, {
            vapidKey: (firebaseConfig as any).vapidKey || 'BBe0-8L5_222222222222222222222222222222222222222222222222222222222222222222222222222222222222222' // Placeholder VAPID key
          });
          
          if (token) {
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: token
            });
            alert('Notifications enabled successfully!');
          }
        }
      }
    } catch (error) {
      console.error('Error registering for notifications:', error);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pb-24 px-4 sm:px-0">
      <div className="glass-card mt-10">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 flex items-center justify-center text-3xl shadow-xl shadow-blue-500/20 text-white font-black">
            {profile?.name ? (
              profile.name.charAt(0).toUpperCase()
            ) : user?.email ? (
              user.email.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-10 h-10" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Profile</h2>
            <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              {profile?.role || 'User'} Account
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</p>
            <p className="text-slate-900 font-bold">{profile?.name || 'N/A'}</p>
          </div>
          <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
            <p className="text-slate-900 font-bold">{user?.email}</p>
          </div>
          {profile?.role === 'driver' && (
            <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</p>
                <p className={`text-sm font-black uppercase tracking-widest ${profile?.isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {profile?.isAvailable ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${profile?.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
            </div>
          )}
        </div>

        {profile?.role === 'driver' && (
          <div className="mb-10 p-6 glass rounded-[2rem] border border-white/40 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Driver Notifications
            </h3>
            <p className="text-[10px] font-bold text-slate-500 leading-relaxed mb-6">
              Enable real-time push notifications to never miss a high-priority order in your area.
            </p>
            {notifPermission !== 'granted' ? (
              <button 
                onClick={registerForNotifications}
                disabled={isRegistering}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50 active:scale-95"
              >
                {isRegistering ? 'Configuring...' : 'Enable Notifications'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Notifications Active
              </div>
            )}
          </div>
        )}

        {profile?.role === 'admin' && (
          <div className="mb-10 space-y-4">
            <div className="flex items-center justify-between px-2 mb-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Console</h2>
              <div className="h-px flex-1 bg-slate-100 mx-4"></div>
            </div>
            <button 
              onClick={() => navigate('/admin/drivers')}
              className="w-full py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 border border-white/40 hover:bg-white/60 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Drivers
            </button>
            <button 
              onClick={() => navigate('/admin/orders')}
              className="w-full py-4 glass rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-white/40 hover:bg-white/60 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Monitor All Orders
            </button>
          </div>
        )}

        <button 
          onClick={handleLogout} 
          className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-rose-600/5"
        >
          Logout Session
        </button>
      </div>
    </div>
  );
}
