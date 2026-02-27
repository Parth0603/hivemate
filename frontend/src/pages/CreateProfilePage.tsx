import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/runtimeConfig';
import './CreateProfilePage.css';

const API_URL = getApiBaseUrl();

const MAX_IMAGE_DIMENSION = 1280;
const MAX_BASE64_BYTES = 4.5 * 1024 * 1024;

const CreateProfilePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    place: '',
    profession: '',
    skills: '',
    bio: '',
    photo: '',
    websiteUrl: '',
    college: '',
    company: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.name || !formData.age || !formData.gender || !formData.place) {
        setError('Please fill in all required fields');
        return;
      }
      if (parseInt(formData.age) < 18 || parseInt(formData.age) > 120) {
        setError('Age must be between 18 and 120');
        return;
      }
    } else if (step === 2) {
      if (!formData.profession || !formData.skills) {
        setError('Please fill in all required fields');
        return;
      }
    }

    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.bio || !formData.photo) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      const profileData = {
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        place: formData.place,
        profession: formData.profession,
        skills: formData.skills.split(',').map(s => s.trim()),
        bio: formData.bio,
        photo: formData.photo,
        photos: [formData.photo],
        websiteUrl: formData.websiteUrl || undefined,
        college: formData.college || undefined,
        company: formData.company || undefined
      };

      await axios.post(`${API_URL}/api/profiles`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Redirect to homepage
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WebP, or GIF image');
      return;
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      setError('File size must be under 10MB');
      return;
    }

    setUploading(true);
    setError('');

    compressImageToBase64(file)
      .then((optimizedBase64) => {
        const bytes = estimateBase64Bytes(optimizedBase64);
        if (bytes > MAX_BASE64_BYTES) {
          setError('Image is still too large after compression. Please choose a smaller image.');
          return;
        }
        setFormData((prev) => ({ ...prev, photo: optimizedBase64 }));
      })
      .catch(() => {
        setError('Failed to process selected image. Please try another image.');
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const estimateBase64Bytes = (dataUrl: string): number => {
    const base64 = dataUrl.split(',')[1] || '';
    return Math.ceil((base64.length * 3) / 4);
  };

  const compressImageToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
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

  return (
    <div className="create-profile-page">
      <div className="profile-container">
        <h1>Create Your Profile</h1>
        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className={`progress-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className={`progress-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {error && <div className="error-message">{error}</div>}

          {step === 1 && (
            <div className="form-step">
              <h2>Basic Information</h2>
              
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="age">Age *</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="25"
                  min="18"
                  max="120"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="gender">Gender *</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="place">Location *</label>
                <input
                  type="text"
                  id="place"
                  name="place"
                  value={formData.place}
                  onChange={handleChange}
                  placeholder="San Francisco, CA"
                  required
                />
              </div>

              <button type="button" onClick={handleNext} className="next-button">
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Professional Details</h2>
              
              <div className="form-group">
                <label htmlFor="profession">Profession *</label>
                <input
                  type="text"
                  id="profession"
                  name="profession"
                  value={formData.profession}
                  onChange={handleChange}
                  placeholder="Software Engineer"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="skills">Skills * (comma-separated)</label>
                <input
                  type="text"
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="JavaScript, React, Node.js"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="company">Company (optional)</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Tech Corp"
                />
              </div>

              <div className="form-group">
                <label htmlFor="college">College (optional)</label>
                <input
                  type="text"
                  id="college"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  placeholder="Stanford University"
                />
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-button">
                  Back
                </button>
                <button type="button" onClick={handleNext} className="next-button">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>About You</h2>
              
              <div className="form-group">
                <label htmlFor="bio">Bio * (max 500 characters)</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  rows={4}
                  required
                />
                <span className="char-count">{formData.bio.length}/500</span>
              </div>

              <div className="form-group">
                <label htmlFor="photoUpload">Upload Profile Photo *</label>
                <input
                  type="file"
                  id="photoUpload"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoFileSelect}
                />
                {uploading && <p>Processing image...</p>}
              </div>

              <div className="form-group">
                <label htmlFor="photo">Or Paste Profile Photo URL</label>
                <input
                  type="url"
                  id="photo"
                  name="photo"
                  value={formData.photo}
                  onChange={handleChange}
                  placeholder="https://example.com/photo.jpg"
                  required
                />
                {formData.photo && (
                  <div className="photo-preview">
                    <img src={formData.photo} alt="Preview" onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="websiteUrl">Website (optional)</label>
                <input
                  type="url"
                  id="websiteUrl"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="button-group">
                <button type="button" onClick={handleBack} className="back-button">
                  Back
                </button>
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? 'Creating Profile...' : 'Complete Profile'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateProfilePage;
