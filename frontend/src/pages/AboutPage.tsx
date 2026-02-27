import { useNavigate } from 'react-router-dom';
import './AboutPage.css';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <header className="about-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>About HiveMate</h1>
      </header>

      <main className="about-content">
        <section className="about-section">
          <h2>🐝 What is HiveMate?</h2>
          <p>
            HiveMate is a geo-powered professional networking ecosystem that merges local 
            connection discovery with professional collaboration. We help professionals discover 
            nearby talent, build meaningful work relationships, and collaborate on projects through 
            an innovative radar-based interface.
          </p>
        </section>

        <section className="about-section">
          <h2>🎯 Our Mission</h2>
          <p>
            To revolutionize professional networking by combining real-time geolocation discovery 
            with career collaboration features, making it easier than ever to find the right people 
            for your professional journey.
          </p>
        </section>

        <section className="about-section">
          <h2>✨ Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📡</div>
              <h3>Radar Discovery</h3>
              <p>Find nearby professionals in real-time using our innovative radar interface</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Privacy Controls</h3>
              <p>Toggle between Explore and Vanish modes to control your visibility</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Encrypted Chat</h3>
              <p>Secure end-to-end encrypted messaging with your connections</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💼</div>
              <h3>Gig Collaboration</h3>
              <p>Create and discover professional opportunities for projects and jobs</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Progressive Trust</h3>
              <p>Communication features unlock as you build relationships</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>AI-Powered Matching</h3>
              <p>Smart profile optimization for better discoverability</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>🚀 How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create Your Profile</h3>
                <p>Share your skills, profession, and professional interests</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Enable Explore Mode</h3>
                <p>Become visible on the radar to discover nearby professionals</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Connect & Collaborate</h3>
                <p>Send connection requests and unlock communication features</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Build Your Network</h3>
                <p>Create gigs, join projects, and grow your professional community</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>🔐 Privacy & Security</h2>
          <p>
            Your privacy and security are our top priorities. We use end-to-end encryption for 
            all messages, secure authentication, and give you complete control over your visibility. 
            Your full profile and photos are only visible to mutual connections, ensuring your 
            information stays private until you choose to share it.
          </p>
        </section>

        <section className="about-section">
          <h2>📧 Contact Us</h2>
          <p>
            Have questions or feedback? We'd love to hear from you!
          </p>
          <div className="contact-info">
            <p>Email: <a href="mailto:support@hivemate.com">support@hivemate.com</a></p>
            <p>Follow us on social media for updates and tips</p>
          </div>
        </section>

        <section className="about-section version-info">
          <p className="version">Version 1.0.0</p>
          <p className="copyright">© 2026 HiveMate. All rights reserved.</p>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
