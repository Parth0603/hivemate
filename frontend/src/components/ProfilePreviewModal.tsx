import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/runtimeConfig';
import './ProfilePreviewModal.css';

interface ProfilePreviewModalProps {
  userId: string;
  initialPhotoUrl?: string;
  initialName?: string;
  onClose: () => void;
}

type RelationshipStatus = 'none' | 'request_sent' | 'request_received' | 'connected';

const ProfilePreviewModal = ({
  userId,
  initialPhotoUrl,
  initialName,
  onClose
}: ProfilePreviewModalProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>('none');
  const [accessLevel, setAccessLevel] = useState<'own' | 'friend' | 'preview' | ''>('');

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    fetchProfileAndRelationship();
  }, [userId]);

  const fetchProfileAndRelationship = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again');
        return;
      }

      const [profileResult, pendingResult] = await Promise.allSettled([
        fetch(`${API_URL}/api/profiles/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/connections/pending`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (profileResult.status !== 'fulfilled') {
        setError('Failed to load profile');
        return;
      }

      const profileResponse = profileResult.value;
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({}));
        setError(errorData.error?.message || 'Failed to load profile');
        return;
      }

      const profileData = await profileResponse.json();
      setProfile(profileData.profile);
      setAccessLevel(profileData.accessLevel || '');

      if (profileData.accessLevel === 'friend' || profileData.accessLevel === 'own') {
        setRelationshipStatus('connected');
        return;
      }

      if (pendingResult.status === 'fulfilled' && pendingResult.value.ok) {
        const pendingData = await pendingResult.value.json();
        const hasSentRequest = (pendingData.sent || []).some(
          (req: any) => String(req.receiverId) === String(userId)
        );
        const hasReceivedRequest = (pendingData.received || []).some(
          (req: any) => String(req.senderId) === String(userId)
        );

        if (hasSentRequest) {
          setRelationshipStatus('request_sent');
        } else if (hasReceivedRequest) {
          setRelationshipStatus('request_received');
        } else {
          setRelationshipStatus('none');
        }
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const sendConnectionRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/connections/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: userId })
      });

      if (response.ok) {
        setRelationshipStatus('request_sent');
      } else {
        const data = await response.json();
        const message = data.error?.message || 'Failed to send request';
        if (
          data.error?.code === 'ALREADY_FRIENDS' ||
          message.toLowerCase().includes('already connected') ||
          message.toLowerCase().includes('already friends')
        ) {
          setRelationshipStatus('connected');
          setError('');
          return;
        }
        setError(message);
      }
    } catch (err) {
      setError('Failed to send request');
    }
  };

  const openChatWithUser = () => {
    onClose();
    navigate(`/chat/${userId}`);
  };

  const openConnections = () => {
    onClose();
    navigate('/connections');
  };

  const profilePhoto = profile?.photos?.[0] || initialPhotoUrl || '';
  const profileName = profile?.name || initialName || 'Unknown User';
  const profileProfession = profile?.profession || '';
  const isConnected = relationshipStatus === 'connected';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button" aria-label="Close profile preview">
          &times;
        </button>

        {loading && <div className="modal-loading">Loading...</div>}

        {error && <div className="modal-error">{error}</div>}

        {profile && (
          <div className="profile-preview">
            <div className="profile-header">
              <div className="profile-avatar-wrap">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={profileName} className="profile-avatar" />
                ) : (
                  <div className="profile-avatar-fallback">{profileName.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <h2>{profileName}</h2>
              <p className="profession">{profileProfession}</p>
              {isConnected && <span className="connection-pill">Connected</span>}
              {accessLevel === 'preview' && !isConnected && (
                <span className="preview-pill">Preview Profile</span>
              )}
            </div>

            <div className="profile-bio">
              <h3>About</h3>
              <p>{profile.bio}</p>
            </div>

            {profile.skills && profile.skills.length > 0 && (
              <div className="profile-skills">
                <h3>Skills</h3>
                <div className="skills-list">
                  {profile.skills.map((skill: string, index: number) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="profile-actions">
              {relationshipStatus === 'connected' ? (
                <button className="open-chat-button" onClick={openChatWithUser} type="button">
                  Open Chat
                </button>
              ) : relationshipStatus === 'request_sent' ? (
                <button className="request-sent-button" disabled>
                  Request Sent
                </button>
              ) : relationshipStatus === 'request_received' ? (
                <button className="pending-review-button" onClick={openConnections} type="button">
                  Review Request
                </button>
              ) : (
                <button className="send-request-button" onClick={sendConnectionRequest} type="button">
                  Send Connection Request
                </button>
              )}

              {!isConnected && (
                <button className="chat-button" disabled title="Chat unlocks after mutual acceptance">
                  Chat (Locked)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePreviewModal;
