import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppContainer from '../components/ui/AppContainer';
import { getApiBaseUrl } from '../utils/runtimeConfig';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  const API_URL = getApiBaseUrl();

  const formatListInput = (value: any) => {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
  };

  const parseListInput = (value: any) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(value)
        ? value
        : [];

  const getInitial = (value: any) => {
    const source = value || profile?.name || formData?.name || 'U';
    return String(source).charAt(0).toUpperCase();
  };

  const toSinglePhotoArray = (photos: any) => {
    if (!Array.isArray(photos) || photos.length === 0) return [];
    const first = photos[0];
    return first ? [first] : [];
  };

  const buildProfilePayload = (source: any, overridePhoto?: string | null) => {
    const photoArray = overridePhoto !== undefined ? (overridePhoto ? [overridePhoto] : []) : toSinglePhotoArray(source.photos);
    return {
      ...source,
      age: source.age ? parseInt(source.age, 10) : undefined,
      skills: parseListInput(source.skills),
      achievements: parseListInput(source.achievements),
      photos: photoArray
    };
  };

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId');
    const targetUserId = paramUserId || currentUserId;
    setIsOwnProfile(targetUserId === currentUserId);
    fetchProfile(targetUserId!);
  }, [paramUserId]);

  const fetchProfile = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/profiles/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedProfile = {
          ...data.profile,
          photos: toSinglePhotoArray(data.profile?.photos)
        };
        setProfile(normalizedProfile);
        setFormData(normalizedProfile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setPhotoError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(profile);
    setPhotoError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const compressImageToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 720;
          const maxHeight = 720;
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = () => reject(new Error('Image decode failed'));
        img.src = String(reader.result || '');
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });

  const saveProfilePayload = async (payload: any) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const response = await fetch(`${API_URL}/api/profiles/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    const data = await response.json();
    const normalizedProfile = {
      ...data.profile,
      photos: toSinglePhotoArray(data.profile?.photos)
    };
    setProfile(normalizedProfile);
    setFormData(normalizedProfile);
    return normalizedProfile;
  };

  const handleProfilePhotoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    try {
      setPhotoUploading(true);
      setPhotoError('');
      const compressed = await compressImageToBase64(file);
      setSelectedPhoto(compressed);
      setPendingPhoto(compressed);
      setIsPhotoPreviewOpen(true);
    } catch (error) {
      console.error('Failed to change profile photo:', error);
      setPhotoError('Failed to update profile photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleConfirmProfilePhoto = async () => {
    if (!pendingPhoto) return;

    try {
      setPhotoUploading(true);
      setPhotoError('');
      const payload = buildProfilePayload(formData, pendingPhoto);
      const updated = await saveProfilePayload(payload);
      setSelectedPhoto(updated.photos?.[0] || null);
      setPendingPhoto(null);
      setIsPhotoPreviewOpen(false);
    } catch (error) {
      console.error('Failed to confirm profile photo:', error);
      setPhotoError('Failed to update profile photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = buildProfilePayload(formData);
      await saveProfilePayload(payload);
      setIsEditing(false);
      setPhotoError('');
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handlePasswordChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordError('');
    setPasswordMessage('');
  };

  const requestChangePasswordOtp = async () => {
    try {
      setPasswordLoading(true);
      setPasswordError('');
      setPasswordMessage('');
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/auth/change-password/request-otp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.error?.message || 'Failed to send OTP');
        }
      });

      setPasswordOtpSent(true);
      setPasswordMessage('OTP sent to your email.');
    } catch (error: any) {
      setPasswordError(error?.message || 'Failed to send OTP');
    } finally {
      setPasswordLoading(false);
    }
  };

  const confirmChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || !passwordData.otp) {
      setPasswordError('All fields are required.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');
      setPasswordMessage('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/change-password/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          otp: passwordData.otp
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Failed to change password');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      setPasswordMessage('Password changed successfully.');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        otp: ''
      });
      setPasswordOtpSent(false);
      setShowChangePassword(false);
    } catch (error: any) {
      setPasswordError(error?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="profile-error">Profile not found</div>;
  }

  const primaryPhoto = profile.photos?.[0] || '';
  const verified = Boolean(profile.verified || profile.verification);
  const isPublicView = !isOwnProfile;
  const infoBlocks = [
    { label: 'Location', value: profile.place || 'Not shared' },
    { label: 'Age', value: profile.age ? String(profile.age) : 'Not shared' },
    { label: 'Religion', value: profile.religionOther || profile.religion || 'Not shared' },
    { label: 'Phone', value: profile.phone || 'Not shared' },
    { label: 'Gender', value: profile.gender || 'Not shared' },
    { label: 'Company', value: profile.company || 'Not shared' },
    { label: 'College', value: profile.college || 'Not shared' }
  ];

  const normalizeWebsite = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const completionChecks = [
    Boolean(profile.name),
    Boolean(profile.profession),
    Boolean(profile.bio),
    Boolean(profile.place),
    Boolean(profile.age),
    Boolean(profile.gender),
    Boolean(profile.websiteUrl),
    Boolean(profile.company || profile.college),
    Array.isArray(profile.skills) && profile.skills.length > 0,
    Boolean(primaryPhoto)
  ];
  const completionScore = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  return (
    <div className="profile-page">
      <AppContainer className="profile-shell" size="sm">
        <div className="profile-topbar">
          <button className="profile-nav-btn" onClick={() => navigate('/home')}>
            Back
          </button>
          {isOwnProfile && !isEditing && (
            <button className="profile-edit-btn" onClick={handleEdit}>
              Edit Profile
            </button>
          )}
        </div>

        <section className="profile-hero">
          <div className="profile-hero-bg"></div>
          <button
            type="button"
            className="profile-avatar-button"
            onClick={() => {
              if (!primaryPhoto && !isOwnProfile) return;
              setSelectedPhoto(primaryPhoto || null);
              setPendingPhoto(null);
              setIsPhotoPreviewOpen(true);
            }}
            aria-label="Preview profile photo"
          >
            <div className="profile-avatar-wrap">
              {primaryPhoto ? (
                <img src={primaryPhoto} alt={profile.name || 'Profile'} className="profile-avatar" />
              ) : (
                <div className="profile-avatar-fallback">{getInitial(profile.name)}</div>
              )}
              {isOwnProfile && (
                <button
                  type="button"
                  className="profile-avatar-edit-trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoError('');
                    photoInputRef.current?.click();
                  }}
                  aria-label="Change profile photo"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M4 20h3.2l9.9-9.9-3.2-3.2L4 16.8V20zm14.7-11.7 1.6-1.6a1.5 1.5 0 0 0 0-2.1l-.9-.9a1.5 1.5 0 0 0-2.1 0l-1.6 1.6 3 3z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              )}
            </div>
          </button>
          <div className="profile-identity">
            <h1>{profile.name || 'Unknown User'}</h1>
            {profile.username && <p className="profile-username">@{profile.username}</p>}
            <p>{profile.profession || 'No profession added'}</p>
            <div className="profile-badges">
              {profile.age && <span className="owner-badge">{profile.age} yrs</span>}
              {verified && <span className="verified-badge">Verified</span>}
              {isOwnProfile && <span className="owner-badge">Your Profile</span>}
              {isPublicView && <span className="public-badge">Public View</span>}
            </div>
          </div>

          {isOwnProfile && (
            <div className="profile-completion-card">
              <div className="completion-top">
                <h4>Profile completion</h4>
                <strong>{completionScore}%</strong>
              </div>
              <div className="completion-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionScore}>
                <div className="completion-fill" style={{ width: `${completionScore}%` }} />
              </div>
              <p>Complete your profile to improve discoverability on radar and search.</p>
            </div>
          )}
        </section>

        {isEditing ? (
          <section className="profile-card profile-edit-form">
            <h2>Edit Your Profile</h2>
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label>Name</label>
                <input type="text" name="name" value={formData.name || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Username</label>
                <input type="text" name="username" value={formData.username || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Profession</label>
                <input type="text" name="profession" value={formData.profession || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Location</label>
                <input type="text" name="place" value={formData.place || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Age</label>
                <input type="number" name="age" value={formData.age || ''} onChange={handleChange} min={18} max={120} />
              </div>
              <div className="profile-form-group">
                <label>Gender</label>
                <input type="text" name="gender" value={formData.gender || ''} onChange={handleChange} placeholder="male / female / other" />
              </div>
              <div className="profile-form-group">
                <label>Religion</label>
                <input type="text" name="religion" value={formData.religion || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Religion Other</label>
                <input type="text" name="religionOther" value={formData.religionOther || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Phone</label>
                <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Company</label>
                <input type="text" name="company" value={formData.company || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>College</label>
                <input type="text" name="college" value={formData.college || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group">
                <label>Website</label>
                <input type="url" name="websiteUrl" value={formData.websiteUrl || ''} onChange={handleChange} />
              </div>
              <div className="profile-form-group profile-form-group-full">
                <label>Skills (comma-separated)</label>
                <input type="text" name="skills" value={formatListInput(formData.skills)} onChange={handleChange} />
              </div>
              <div className="profile-form-group profile-form-group-full">
                <label>Achievements (comma-separated)</label>
                <input type="text" name="achievements" value={formatListInput(formData.achievements)} onChange={handleChange} />
              </div>
              <div className="profile-form-group profile-form-group-full">
                <label>Bio</label>
                <textarea name="bio" value={formData.bio || ''} onChange={handleChange} rows={4} maxLength={500} />
              </div>
            </div>

            <div className="form-actions">
              <button className="save-button" onClick={handleSave}>Save Changes</button>
              <button className="cancel-button" onClick={handleCancel}>Cancel</button>
            </div>
          </section>
        ) : (
          <div className="profile-layout">
            {isOwnProfile && (
              <section className="profile-card quick-actions">
                <h3>Quick Actions</h3>
                <div className="quick-actions-grid">
                  <button onClick={() => navigate('/friends')}>Friends</button>
                  <button onClick={() => navigate('/connections')}>Connections</button>
                  <button onClick={() => navigate('/chat')}>Messages</button>
                  <button onClick={() => navigate('/gig/create')}>Add Gig</button>
                  <button
                    onClick={() => {
                      setShowChangePassword((prev) => !prev);
                      setPasswordError('');
                      setPasswordMessage('');
                    }}
                  >
                    Change Password
                  </button>
                </div>

                {showChangePassword && (
                  <div className="change-password-panel">
                    <div className="change-password-row">
                      <button
                        type="button"
                        className="change-password-otp-btn"
                        onClick={requestChangePasswordOtp}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? 'Sending OTP...' : 'Send OTP'}
                      </button>
                    </div>

                    <div className="change-password-fields">
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChangeInput}
                        placeholder="Current password"
                      />
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChangeInput}
                        placeholder="New password"
                      />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChangeInput}
                        placeholder="Confirm new password"
                      />
                      <input
                        type="text"
                        name="otp"
                        value={passwordData.otp}
                        onChange={handlePasswordChangeInput}
                        placeholder="OTP from email"
                        disabled={!passwordOtpSent}
                      />
                    </div>

                    <button
                      type="button"
                      className="change-password-confirm-btn"
                      onClick={confirmChangePassword}
                      disabled={passwordLoading || !passwordOtpSent}
                    >
                      {passwordLoading ? 'Updating...' : 'Confirm Password Change'}
                    </button>

                    {passwordMessage && <p className="password-message">{passwordMessage}</p>}
                    {passwordError && <p className="password-error">{passwordError}</p>}
                  </div>
                )}
              </section>
            )}

            <section className="profile-card">
              <h3>About</h3>
              <p className="profile-about">{profile.bio || 'No bio added yet.'}</p>
            </section>

            {!isPublicView && (
              <section className="profile-card">
                <h3>Details</h3>
                <div className="profile-details-grid">
                  {infoBlocks.map((item) => (
                    <div key={item.label} className="detail-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                  <div className="detail-item">
                    <span>Website</span>
                    {profile.websiteUrl ? (
                      <a href={normalizeWebsite(profile.websiteUrl)} target="_blank" rel="noopener noreferrer">
                        {profile.websiteUrl}
                      </a>
                    ) : (
                      <strong>Not shared</strong>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="profile-card">
              <h3>Skills</h3>
              <div className="skills-container">
                {(profile.skills || []).length > 0 ? (
                  profile.skills.map((skill: string, index: number) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))
                ) : (
                  <p className="profile-empty-text">No skills added yet.</p>
                )}
              </div>
            </section>

            <section className="profile-card">
              <h3>Achievements</h3>
              {(profile.achievements || []).length > 0 ? (
                <ul className="achievements-list">
                  {profile.achievements.map((achievement: string, index: number) => (
                    <li key={index}>{achievement}</li>
                  ))}
                </ul>
              ) : (
                <p className="profile-empty-text">No achievements listed yet.</p>
              )}
            </section>
          </div>
        )}
      </AppContainer>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleProfilePhotoFile}
        className="hidden-photo-input"
      />

      {isPhotoPreviewOpen && (
        <div
          className="photo-lightbox"
          onClick={() => {
            setIsPhotoPreviewOpen(false);
            setSelectedPhoto(null);
            setPendingPhoto(null);
          }}
        >
          <button
            type="button"
            className="photo-lightbox-close"
            onClick={() => {
              setIsPhotoPreviewOpen(false);
              setSelectedPhoto(null);
              setPendingPhoto(null);
            }}
            aria-label="Close photo preview"
          >
            ×
          </button>
          <div className="photo-lightbox-body" onClick={(e) => e.stopPropagation()}>
            {selectedPhoto ? (
              <img src={selectedPhoto} alt="Profile preview" className="photo-lightbox-image" />
            ) : (
              <div className="photo-lightbox-fallback">{getInitial(profile.name)}</div>
            )}
            {isOwnProfile && pendingPhoto && (
              <button
                type="button"
                className="photo-confirm-btn"
                onClick={handleConfirmProfilePhoto}
                disabled={photoUploading}
              >
                {photoUploading ? 'Updating photo...' : 'Confirm Photo'}
              </button>
            )}
            {photoError && isOwnProfile && (
              <p className="photo-lightbox-error">{photoError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
