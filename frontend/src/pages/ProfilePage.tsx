import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
        setProfile(data.profile);
        setFormData(data.profile);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(profile);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      const response = await fetch(`${API_URL}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          skills: typeof formData.skills === 'string' 
            ? formData.skills.split(',').map((s: string) => s.trim())
            : formData.skills
        })
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="profile-error">Profile not found</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header-section">
          <button className="back-button" onClick={() => navigate('/home')}>
            ← Back
          </button>
          {isOwnProfile && !isEditing && (
            <button className="edit-button" onClick={handleEdit}>
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="profile-edit-form">
            <h2>Edit Profile</h2>
            
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Profession</label>
              <input
                type="text"
                name="profession"
                value={formData.profession || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                name="skills"
                value={Array.isArray(formData.skills) ? formData.skills.join(', ') : formData.skills}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleChange}
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="websiteUrl"
                value={formData.websiteUrl || ''}
                onChange={handleChange}
              />
            </div>

            <div className="form-actions">
              <button className="save-button" onClick={handleSave}>Save Changes</button>
              <button className="cancel-button" onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="profile-view">
            <div className="profile-info">
              <h1>{profile.name}</h1>
              <p className="profession">{profile.profession}</p>
              <p className="location">📍 {profile.place}</p>
              {profile.age && <p className="age">Age: {profile.age}</p>}
            </div>

            {profile.bio && (
              <div className="profile-section">
                <h3>About</h3>
                <p>{profile.bio}</p>
              </div>
            )}

            {profile.skills && profile.skills.length > 0 && (
              <div className="profile-section">
                <h3>Skills</h3>
                <div className="skills-container">
                  {profile.skills.map((skill: string, index: number) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.achievements && profile.achievements.length > 0 && (
              <div className="profile-section">
                <h3>Achievements</h3>
                <ul>
                  {profile.achievements.map((achievement: string, index: number) => (
                    <li key={index}>{achievement}</li>
                  ))}
                </ul>
              </div>
            )}

            {profile.websiteUrl && (
              <div className="profile-section">
                <h3>Website</h3>
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">
                  {profile.websiteUrl}
                </a>
              </div>
            )}

            {profile.photos && profile.photos.length > 0 && (
              <div className="profile-section">
                <h3>Photos</h3>
                <div className="photos-grid">
                  {profile.photos.map((photo: string, index: number) => (
                    <img key={index} src={photo} alt={`Photo ${index + 1}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
