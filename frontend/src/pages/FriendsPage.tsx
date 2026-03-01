import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/runtimeConfig';
import AppContainer from '../components/ui/AppContainer';
import PageHeader from '../components/ui/PageHeader';
import { goToProfile } from '../utils/profileRouting';
import './FriendsPage.css';

interface Friend {
  friendshipId: string;
  friendId: string;
  name: string;
  profession?: string;
  place?: string;
  bio?: string;
  photos?: string[];
  communicationLevel: string;
}

const FriendsPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const API_URL = getApiBaseUrl();
  const currentUserId = localStorage.getItem('userId') || '';
  const isOwnList = !userId || String(userId) === String(currentUserId);

  useEffect(() => {
    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = isOwnList ? `${API_URL}/api/friends` : `${API_URL}/api/friends/user/${userId}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        if (!isOwnList && data.owner?.name) {
          setOwnerName(data.owner.name);
        } else {
          setOwnerName('');
        }
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  const handleBlockFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to block this user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/friends/${friendshipId}/block`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error('Failed to block friend:', error);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    (friend.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="friends-page">
      <AppContainer size="sm">
        <div className="friends-container ui-card">
          <PageHeader
            title={isOwnList ? 'Friends' : `${ownerName || 'User'}'s Friends`}
            leftSlot={
              <button className="back-button ui-btn ui-btn-ghost" onClick={() => navigate('/home')}>
                Back
              </button>
            }
          />

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="friends-loading">Loading friends...</div>
        ) : filteredFriends.length === 0 ? (
          <div className="no-friends">
            <p>No friends yet</p>
            <p className="subtitle">Incoming requests are available in Connections.</p>
          </div>
        ) : (
          <div className="friends-list">
            {filteredFriends.map((friend) => (
              <div key={friend.friendshipId} className="friend-card">
                <div
                  className="friend-info"
                  role="button"
                  tabIndex={0}
                  onClick={() => goToProfile(navigate, friend.friendId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goToProfile(navigate, friend.friendId);
                    }
                  }}
                >
                  <h3>{friend.name}</h3>
                  <p className="profession">{friend.profession || ''}</p>
                  <span className={`comm-level ${friend.communicationLevel}`}>
                    {friend.communicationLevel === 'chat' && 'Chat'}
                    {friend.communicationLevel === 'voice' && 'Voice'}
                    {friend.communicationLevel === 'video' && 'Video'}
                  </span>
                </div>
                {isOwnList && (
                  <div className="friend-actions">
                    <button className="message-btn ui-btn ui-btn-primary" onClick={() => navigate(`/chat/${friend.friendId}`)}>
                      Message
                    </button>
                    <button className="remove-btn ui-btn ui-btn-secondary" onClick={() => handleRemoveFriend(friend.friendshipId)}>
                      Remove
                    </button>
                    <button className="block-btn ui-btn ui-btn-ghost" onClick={() => handleBlockFriend(friend.friendshipId)}>
                      Block
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </AppContainer>
    </div>
  );
};

export default FriendsPage;
