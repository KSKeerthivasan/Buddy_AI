import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react';
import { fetchUnreadNotifications, markNotificationAsRead } from '../api/notificationApi';
import type { Notification } from '../api/notificationApi';

interface NotificationTrayProps {
  userId: string;
}

export const NotificationTray: React.FC<NotificationTrayProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    // In a real app, we'd use WebSockets or SSE here. Polling for MVP.
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchUnreadNotifications(userId);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'ACTION_REQUIRED': return <Zap className="w-5 h-5 text-purple-400" />;
      case 'ALERT': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'ACHIEVEMENT': return <CheckCircle className="w-5 h-5 text-green-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="relative" ref={trayRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <Bell className="w-6 h-6 text-gray-300 hover:text-white transition-colors" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
            <h3 className="font-semibold text-white">Notifications</h3>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">{notifications.length} Unread</span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-3">
                <CheckCircle className="w-8 h-8 text-gray-700" />
                <p>You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {notifications.map(notification => (
                  <div key={notification.id} className="p-4 hover:bg-gray-800/50 transition-colors group flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getIconForCategory(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 mb-1">{notification.title}</p>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">{notification.message}</p>
                      
                      <div className="flex items-center justify-between">
                        {notification.actionPayload && (
                          <button 
                            className="text-xs px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 rounded-md font-medium transition-colors"
                            onClick={() => {
                              if (notification.actionPayload?.type === 'VIEW_DECISION' && notification.actionPayload?.targetId) {
                                setIsOpen(false);
                                navigate(`/tasks/${notification.actionPayload.targetId}/decisions`);
                              } else {
                                alert(`Executing action: ${notification.actionPayload?.type}`);
                              }
                            }}
                          >
                            {notification.actionPayload.type.replace('VIEW_', 'VIEW ')}
                          </button>
                        )}
                        <button 
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-gray-500 hover:text-gray-300 ml-auto transition-colors"
                        >
                          Mark read
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
