import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RadarView from '../components/RadarView';
import GigFeed from '../components/GigFeed';
import NotificationBell from '../components/NotificationBell';
import AppContainer from '../components/ui/AppContainer';
import './HomePage.css';

type ViewMode = 'partner' | 'teammate';

const HomePage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('partner');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Check subscription status
    checkSubscriptionStatus();

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navigate]);

  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/subscriptions/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.subscription?.plan === 'premium' && data.subscription?.status === 'active');
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    // Clear any other stored data
    localStorage.removeItem('privateKey');
    localStorage.removeItem('publicKey');
    navigate('/login');
  };

  const handleCreateGig = () => {
    navigate('/gig/create');
  };

  return (
    <div className="homepage">
      <header className="homepage-header">
        <h1 className="app-name">SocialHive</h1>
        
        <div className="header-actions" ref={menuRef}>
          {!isPremium && (
            <button 
              className="upgrade-badge ui-btn ui-btn-secondary"
              onClick={() => navigate('/subscription')}
              title="Upgrade to Premium"
            >
              ⭐ Upgrade
            </button>
          )}
          
          <button 
            className="search-button"
            onClick={() => navigate('/search')}
            title="Advanced Search"
            aria-label="Open advanced search"
          >
            🔍
          </button>
          
          <NotificationBell />
          
          <button 
            className="hamburger-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {menuOpen && (
            <div className="dropdown-menu">
              <button onClick={() => { navigate('/profile'); setMenuOpen(false); }}>
                <span className="menu-icon">👤</span>
                Profile
              </button>
              <button onClick={() => { navigate('/friends'); setMenuOpen(false); }}>
                <span className="menu-icon">👥</span>
                Friend List
              </button>
              <button onClick={() => { navigate('/connections'); setMenuOpen(false); }}>
                <span className="menu-icon">🤝</span>
                Connections
              </button>
              <button onClick={() => { navigate('/chat'); setMenuOpen(false); }}>
                <span className="menu-icon">💬</span>
                Messages
              </button>
              <button onClick={() => { navigate('/subscription'); setMenuOpen(false); }}>
                <span className="menu-icon">⭐</span>
                Subscription
              </button>
              <button onClick={() => { navigate('/about'); setMenuOpen(false); }}>
                <span className="menu-icon">ℹ️</span>
                About Us
              </button>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="logout-button">
                <span className="menu-icon">🚪</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <AppContainer className="home-shell">
        <div className="mode-toggle-container">
          <div className="mode-toggle ui-card">
            <button
              className={`toggle-option ${viewMode === 'partner' ? 'active' : ''}`}
              onClick={() => setViewMode('partner')}
            >
              Find a Partner
            </button>
            <button
              className={`toggle-option ${viewMode === 'teammate' ? 'active' : ''}`}
              onClick={() => setViewMode('teammate')}
            >
              Find a Team Mate
            </button>
          </div>
        </div>

        <main className="homepage-content">
          {viewMode === 'partner' ? (
            <RadarView />
          ) : (
            <GigFeed onCreateGig={handleCreateGig} />
          )}
        </main>
      </AppContainer>
    </div>
  );
};

export default HomePage;
