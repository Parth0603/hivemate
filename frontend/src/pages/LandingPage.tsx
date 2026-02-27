import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-header">
        <h1>SocialHive</h1>
        <p className="tagline">Professional Networking Meets Local Discovery</p>
      </div>

      <div className="landing-content">
        <div className="radar-preview">
          <div className="radar-circle">
            <div className="radar-dot blue" style={{ top: '30%', left: '40%' }}></div>
            <div className="radar-dot pink" style={{ top: '60%', left: '70%' }}></div>
            <div className="radar-dot blue" style={{ top: '50%', left: '20%' }}></div>
            <div className="radar-dot pink" style={{ top: '80%', left: '50%' }}></div>
          </div>
          <p className="radar-label">Discover professionals nearby</p>
        </div>

        <div className="about-section">
          <h2>About SocialHive</h2>
          <div className="features">
            <div className="feature">
              <h3>🎯 Geo-Powered Discovery</h3>
              <p>Find professionals and collaborators in your area with our real-time radar system</p>
            </div>
            <div className="feature">
              <h3>🤝 Professional Networking</h3>
              <p>Connect with like-minded individuals, build your network, and grow together</p>
            </div>
            <div className="feature">
              <h3>💼 Gig Collaboration</h3>
              <p>Post and discover jobs, startups, projects, and hackathons</p>
            </div>
            <div className="feature">
              <h3>🔒 Privacy First</h3>
              <p>Control your visibility with Explore/Vanish mode and end-to-end encrypted messaging</p>
            </div>
          </div>
        </div>

        <button className="start-button" onClick={() => navigate('/register')}>
          Get Started
        </button>

        <p className="login-link">
          Already have an account? <span onClick={() => navigate('/login')}>Sign In</span>
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
