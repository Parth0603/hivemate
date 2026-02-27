import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchPage.css';

interface SearchFilters {
  query: string;
  skills: string[];
  profession: string;
  niche: string;
  distance: number;
  gigType: string;
  paymentStatus: string;
}

interface Profile {
  _id: string;
  userId: string;
  name: string;
  profession: string;
  skills: string[];
  bio: string;
  place: string;
  photos: string[];
}

interface Gig {
  _id: string;
  title: string;
  description: string;
  type: string;
  paymentStatus: string;
  skillsRequired: string[];
  creatorId: {
    _id: string;
    name: string;
    profession: string;
  };
}

type SearchMode = 'profiles' | 'gigs';

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<SearchMode>('profiles');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    skills: [],
    profession: '',
    niche: '',
    distance: 10,
    gigType: '',
    paymentStatus: ''
  });
  const [skillInput, setSkillInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [gigResults, setGigResults] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Common skills for autocomplete
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js',
    'Angular', 'Vue.js', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker',
    'Kubernetes', 'Machine Learning', 'Data Science', 'UI/UX Design',
    'Product Management', 'Marketing', 'Sales', 'Business Development'
  ];

  useEffect(() => {
    // Get user location for distance-based search
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (filters.query || filters.skills.length > 0 || filters.profession || filters.niche) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, searchMode]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      if (searchMode === 'profiles') {
        const body: any = {
          page: 1,
          limit: 20
        };

        if (filters.skills.length > 0) {
          body.skills = filters.skills;
        }
        if (filters.profession) {
          body.profession = filters.profession;
        }
        if (filters.niche) {
          body.niche = filters.niche;
        }
        if (filters.distance && userLocation) {
          body.distance = filters.distance;
          body.lat = userLocation.lat;
          body.lng = userLocation.lng;
        }

        const response = await fetch(`${API_URL}/api/search/profiles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          setProfileResults(data.profiles || []);
        }
      } else {
        const body: any = {
          page: 1,
          limit: 20
        };

        if (filters.gigType) {
          body.type = filters.gigType;
        }
        if (filters.skills.length > 0) {
          body.skills = filters.skills;
        }
        if (filters.paymentStatus) {
          body.paymentStatus = filters.paymentStatus;
        }

        const response = await fetch(`${API_URL}/api/search/gigs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          setGigResults(data.gigs || []);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkillInput = (value: string) => {
    setSkillInput(value);
    if (value.length > 0) {
      const filtered = commonSkills.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase()) &&
        !filters.skills.includes(skill)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const addSkill = (skill: string) => {
    if (!filters.skills.includes(skill)) {
      setFilters({ ...filters, skills: [...filters.skills, skill] });
    }
    setSkillInput('');
    setSuggestions([]);
  };

  const removeSkill = (skill: string) => {
    setFilters({
      ...filters,
      skills: filters.skills.filter(s => s !== skill)
    });
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      skills: [],
      profession: '',
      niche: '',
      distance: 10,
      gigType: '',
      paymentStatus: ''
    });
    setProfileResults([]);
    setGigResults([]);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.skills.length > 0) count++;
    if (filters.profession) count++;
    if (filters.niche) count++;
    if (filters.gigType) count++;
    if (filters.paymentStatus) count++;
    return count;
  };

  return (
    <div className="search-page">
      <header className="search-header">
        <button className="back-button" onClick={() => navigate('/home')}>
          ← Back
        </button>
        <h1>Advanced Search</h1>
      </header>

      <div className="search-mode-toggle">
        <button
          className={searchMode === 'profiles' ? 'active' : ''}
          onClick={() => setSearchMode('profiles')}
        >
          Search Profiles
        </button>
        <button
          className={searchMode === 'gigs' ? 'active' : ''}
          onClick={() => setSearchMode('gigs')}
        >
          Search Gigs
        </button>
      </div>

      <div className="search-container">
        <div className="search-bar-container">
          <input
            type="text"
            className="search-bar"
            placeholder={searchMode === 'profiles' ? 'Search by name, profession, or skills...' : 'Search gigs...'}
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
          <button
            className="filter-toggle-button"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
          </button>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <div className="filter-header">
              <h3>Filters</h3>
              {getActiveFilterCount() > 0 && (
                <button className="clear-filters" onClick={clearFilters}>
                  Clear All
                </button>
              )}
            </div>

            <div className="filter-section">
              <label>Skills</label>
              <div className="skill-input-container">
                <input
                  type="text"
                  placeholder="Add skills..."
                  value={skillInput}
                  onChange={(e) => handleSkillInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && skillInput) {
                      addSkill(skillInput);
                    }
                  }}
                />
                {suggestions.length > 0 && (
                  <div className="autocomplete-suggestions">
                    {suggestions.map((skill) => (
                      <div
                        key={skill}
                        className="suggestion-item"
                        onClick={() => addSkill(skill)}
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="selected-skills">
                {filters.skills.map((skill) => (
                  <span key={skill} className="skill-tag">
                    {skill}
                    <button onClick={() => removeSkill(skill)}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {searchMode === 'profiles' && (
              <>
                <div className="filter-section">
                  <label>Profession</label>
                  <input
                    type="text"
                    placeholder="e.g., Software Engineer"
                    value={filters.profession}
                    onChange={(e) => setFilters({ ...filters, profession: e.target.value })}
                  />
                </div>

                <div className="filter-section">
                  <label>Niche/Specialization</label>
                  <input
                    type="text"
                    placeholder="e.g., Machine Learning"
                    value={filters.niche}
                    onChange={(e) => setFilters({ ...filters, niche: e.target.value })}
                  />
                </div>

                <div className="filter-section">
                  <label>Distance Range: {filters.distance} km</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={filters.distance}
                    onChange={(e) => setFilters({ ...filters, distance: parseInt(e.target.value) })}
                    disabled={!userLocation}
                  />
                  {!userLocation && (
                    <p className="filter-note">Enable location to use distance filter</p>
                  )}
                </div>
              </>
            )}

            {searchMode === 'gigs' && (
              <>
                <div className="filter-section">
                  <label>Gig Type</label>
                  <select
                    value={filters.gigType}
                    onChange={(e) => setFilters({ ...filters, gigType: e.target.value })}
                  >
                    <option value="">All Types</option>
                    <option value="job">💼 Job</option>
                    <option value="startup">🚀 Startup</option>
                    <option value="project">📁 Project</option>
                    <option value="hackathon">⚡ Hackathon</option>
                  </select>
                </div>

                <div className="filter-section">
                  <label>Payment Status</label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                  >
                    <option value="">All</option>
                    <option value="paid">💰 Paid</option>
                    <option value="unpaid">🤝 Unpaid</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        <div className="search-results">
          {loading ? (
            <div className="loading">Searching...</div>
          ) : searchMode === 'profiles' ? (
            profileResults.length > 0 ? (
              <div className="profile-results">
                {profileResults.map((profile) => (
                  <div
                    key={profile._id}
                    className="profile-card"
                    onClick={() => navigate(`/profile/${profile.userId}`)}
                  >
                    <div className="profile-header">
                      {profile.photos && profile.photos[0] && (
                        <img src={profile.photos[0]} alt={profile.name} />
                      )}
                      <div className="profile-info">
                        <h3>{profile.name}</h3>
                        <p className="profession">{profile.profession}</p>
                        <p className="location">📍 {profile.place}</p>
                      </div>
                    </div>
                    <p className="bio">{profile.bio}</p>
                    <div className="skills">
                      {profile.skills.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="skill-badge">{skill}</span>
                      ))}
                      {profile.skills.length > 4 && (
                        <span className="skill-badge">+{profile.skills.length - 4}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <p>No profiles found</p>
                <p className="no-results-subtitle">Try adjusting your filters</p>
              </div>
            )
          ) : (
            gigResults.length > 0 ? (
              <div className="gig-results">
                {gigResults.map((gig) => (
                  <div
                    key={gig._id}
                    className="gig-card"
                    onClick={() => navigate(`/gig/${gig._id}`)}
                  >
                    <div className="gig-header">
                      <span className="gig-type">{gig.type}</span>
                      <span className={`payment-badge ${gig.paymentStatus}`}>
                        {gig.paymentStatus === 'paid' ? '💰 Paid' : '🤝 Unpaid'}
                      </span>
                    </div>
                    <h3>{gig.title}</h3>
                    <p className="description">{gig.description}</p>
                    <div className="skills">
                      {gig.skillsRequired.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="skill-badge">{skill}</span>
                      ))}
                      {gig.skillsRequired.length > 4 && (
                        <span className="skill-badge">+{gig.skillsRequired.length - 4}</span>
                      )}
                    </div>
                    <div className="gig-footer">
                      <span className="creator">By {gig.creatorId.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <p>No gigs found</p>
                <p className="no-results-subtitle">Try adjusting your filters</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
