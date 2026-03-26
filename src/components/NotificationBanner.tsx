import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  body: string;
  orderId?: string;
}

export function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  // This will be triggered by the FCM foreground listener or a custom event
  useEffect(() => {
    const handleNewNotification = (event: any) => {
      const { title, body, orderId } = event.detail;
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, title, body, orderId }]);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 10000);
    };

    window.addEventListener('app-notification', handleNewNotification);
    return () => window.removeEventListener('app-notification', handleNewNotification);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleAction = (notification: Notification) => {
    if (notification.orderId) {
      navigate(`/orders/${notification.orderId}`);
    }
    removeNotification(notification.id);
  };

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(notification => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="bg-white border-l-4 border-blue-600 rounded-lg shadow-2xl p-4 w-80 pointer-events-auto flex items-start space-x-3"
          >
            <div className="bg-blue-100 p-2 rounded-full">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-grow">
              <h4 className="font-bold text-gray-900 text-sm">{notification.title}</h4>
              <p className="text-gray-600 text-xs mt-1">{notification.body}</p>
              <button 
                onClick={() => handleAction(notification)}
                className="mt-2 text-blue-600 text-xs font-bold hover:underline"
              >
                View Order Details
              </button>
            </div>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
