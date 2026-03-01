import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, getWsBaseUrl } from '../utils/runtimeConfig';
import { ensureFriendRequestPushSubscription } from '../utils/pushNotifications';
import './NotificationBell.css';

interface Notification {
  _id: string;
  userId: string;
  type: 'nearby' | 'friend_request' | 'friend_accepted' | 'gig_application' | 'message' | 'call_request';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M12 4.5a4.2 4.2 0 0 0-4.2 4.2v2.6c0 1.4-.6 2.7-1.6 3.7L5 16.2h14l-1.2-1.2a5.2 5.2 0 0 1-1.6-3.7V8.7A4.2 4.2 0 0 0 12 4.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M10.2 18a1.8 1.8 0 0 0 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const normalizeNotification = (notification: any): Notification => ({
  _id: notification?._id || notification?.id || `${Date.now()}-${Math.random()}`,
  userId: notification?.userId || '',
  type: notification?.type || 'message',
  title: notification?.title || 'Notification',
  message: notification?.message || '',
  data: notification?.data,
  read: Boolean(notification?.read),
  createdAt: notification?.createdAt || notification?.timestamp || new Date().toISOString()
});

const getNotificationKey = (notification: Notification): string => {
  const requestId = notification?.data?.requestId;
  const messageId = notification?.data?.messageId;
  const senderId = notification?.data?.senderId;
  if (requestId) return `friend:${requestId}`;
  if (messageId) return `message:${messageId}`;
  return `${notification.type}:${senderId || ''}:${notification.message}:${notification.createdAt}`;
};

const normalizeId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value.$oid) return String(value.$oid);
    if (value._id) return normalizeId(value._id);
    if (typeof value.toString === 'function') {
      const asText = value.toString();
      if (asText && asText !== '[object Object]') return asText;
    }
  }
  return String(value);
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loadNotificationsRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    loadNotifications();
    connectWebSocket();
    ensureFriendRequestPushSubscription().catch((error) => {
      console.error('Push subscription setup failed:', error);
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const onSoftRefresh = () => {
      loadNotificationsRef.current();
    };

    window.addEventListener('hivemate:soft-refresh', onSoftRefresh as EventListener);
    return () => {
      window.removeEventListener('hivemate:soft-refresh', onSoftRefresh as EventListener);
    };
  }, []);

  useEffect(() => {
    const refreshOnResume = () => {
      if (document.visibilityState === 'visible') {
        loadNotificationsRef.current();
      }
    };

    const refreshOnFocus = () => {
      loadNotificationsRef.current();
    };

    const refreshOnOnline = () => {
      loadNotificationsRef.current();
    };

    document.addEventListener('visibilitychange', refreshOnResume);
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('online', refreshOnOnline);

    return () => {
      document.removeEventListener('visibilitychange', refreshOnResume);
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('online', refreshOnOnline);
    };
  }, []);

  const connectWebSocket = () => {
    const token = localStorage.getItem('token');
    const WS_URL = getWsBaseUrl();

    const newSocket = io(WS_URL, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected for notifications');
      loadNotificationsRef.current();
    });

    newSocket.on('notification:new', (notification: any) => {
      console.log('New notification received:', notification);
      const normalized = normalizeNotification(notification);
      setNotifications(prev => {
        const nextKey = getNotificationKey(normalized);
        const exists = prev.some((item) => getNotificationKey(item) === nextKey);
        if (exists) return prev;
        return [normalized, ...prev];
      });
      setUnreadCount(prev => prev + (normalized.read ? 0 : 1));
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current = newSocket;
  };

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = getApiBaseUrl();

      const response = await fetch(`${API_URL}/api/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedList: Notification[] = (data.notifications || []).map(normalizeNotification);
        const dedupedMap = new Map<string, Notification>();
        normalizedList.forEach((item) => {
          const key = getNotificationKey(item);
          if (!dedupedMap.has(key)) dedupedMap.set(key, item);
        });
        setNotifications(Array.from(dedupedMap.values()));
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    loadNotificationsRef.current = loadNotifications;
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotificationsRef.current();
    }
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = getApiBaseUrl();

      const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = getApiBaseUrl();

      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const API_URL = getApiBaseUrl();

      const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const notification = notifications.find(n => n._id === notificationId);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (notification && !notification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'nearby':
        return '\u{1F4CD}';
      case 'friend_request':
        return '\u{1F464}';
      case 'friend_accepted':
        return '\u2705';
      case 'gig_application':
        return '\u{1F4BC}';
      case 'message':
        return '\u{1F4AC}';
      case 'call_request':
        return '\u{1F4DE}';
      default:
        return '\u{1F514}';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    setIsOpen(false);

    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate('/connections');
      return;
    }

    if (notification.type === 'message') {
      const chatRoomId = normalizeId(notification?.data?.chatRoomId);
      const targetUserId = normalizeId(
        notification?.data?.senderId ||
        notification?.data?.fromUserId ||
        notification?.data?.userId ||
        notification?.data?.callerId
      );

      if (chatRoomId) {
        navigate(`/chat?room=${encodeURIComponent(chatRoomId)}`);
      } else if (targetUserId) {
        navigate(`/chat/${targetUserId}`);
      } else {
        navigate('/chat');
      }
      return;
    }

    if (notification.type === 'call_request') {
      const callId = normalizeId(notification?.data?.callId);
      const callType = notification?.data?.callType === 'video' ? 'video' : 'voice';
      const callerId = normalizeId(notification?.data?.callerId);
      const callerName = String(notification?.data?.callerName || 'Unknown');
      if (callId) {
        const params = new URLSearchParams({
          incomingCall: '1',
          callId,
          type: callType,
          from: callerId,
          name: callerName
        });
        navigate(`/chat?${params.toString()}`);
      } else {
        navigate('/chat');
      }
      return;
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="bell-icon">
          <BellIcon />
        </span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" type="button" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTimestamp(notification.createdAt)}
                    </div>
                  </div>
                  <button
                    className="notification-delete"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    aria-label="Delete notification"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
