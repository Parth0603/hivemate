import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../utils/runtimeConfig';
import { getWsBaseUrl } from '../utils/runtimeConfig';
import AppContainer from '../components/ui/AppContainer';
import PageHeader from '../components/ui/PageHeader';
import './ConnectionsPage.css';

interface ConnectionRequest {
  id: string;
  senderId?: string;
  senderName?: string;
  senderProfession?: string;
  receiverId?: string;
  receiverName?: string;
  receiverProfession?: string;
  createdAt: string;
}

const ConnectionsPage = () => {
  const navigate = useNavigate();
  const [received, setReceived] = useState<ConnectionRequest[]>([]);
  const [sent, setSent] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const API_URL = getApiBaseUrl();
  const WS_URL = getWsBaseUrl();

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    const onSoftRefresh = () => {
      fetchRequests();
    };

    window.addEventListener('hivemate:soft-refresh', onSoftRefresh as EventListener);
    return () => {
      window.removeEventListener('hivemate:soft-refresh', onSoftRefresh as EventListener);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket: Socket = io(WS_URL, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    const refresh = () => {
      fetchRequests();
    };

    socket.on('connections:pending_updated', refresh);
    socket.on('friendship:established', refresh);
    socket.on('notification:new', (notification: any) => {
      if (notification?.type === 'friend_request' || notification?.type === 'friend_accepted') {
        refresh();
      }
    });

    return () => {
      socket.off('connections:pending_updated', refresh);
      socket.off('friendship:established', refresh);
      socket.off('notification:new');
      socket.disconnect();
    };
  }, [WS_URL]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/connections/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReceived(data.received || []);
        setSent(data.sent || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/connections/${requestId}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/connections/${requestId}/decline`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  return (
    <div className="connections-page">
      <AppContainer size="sm">
        <div className="connections-container ui-card">
          <PageHeader
            title="Connection Requests"
            leftSlot={
              <button className="back-button ui-btn ui-btn-ghost" onClick={() => navigate('/home')}>
                Back
              </button>
            }
          />

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Received ({received.length})
          </button>
          <button
            className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Sent ({sent.length})
          </button>
        </div>

        {loading ? (
          <div className="connections-loading">Loading requests...</div>
        ) : (
          <div className="requests-list">
            {activeTab === 'received' ? (
              received.length === 0 ? (
                <div className="no-requests">No pending requests</div>
              ) : (
                received.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-info">
                      <h3>{request.senderName || 'Unknown User'}</h3>
                      <p className="profession">{request.senderProfession || ''}</p>
                      <p className="date">{new Date(request.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="request-actions">
                      <button className="accept-btn ui-btn ui-btn-primary" onClick={() => handleAccept(request.id)}>
                        Accept
                      </button>
                      <button className="decline-btn ui-btn ui-btn-secondary" onClick={() => handleDecline(request.id)}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              sent.length === 0 ? (
                <div className="no-requests">No pending requests</div>
              ) : (
                sent.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-info">
                      <h3>{request.receiverName || 'Unknown User'}</h3>
                      <p className="profession">{request.receiverProfession || ''}</p>
                      <p className="date">
                        Sent on {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      <span className="status-badge pending">Pending</span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
        </div>
      </AppContainer>
    </div>
  );
};

export default ConnectionsPage;
