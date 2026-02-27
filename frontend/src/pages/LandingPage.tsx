import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import './LandingPage.css';

interface RadarDot {
  id: number;
  x: number;
  y: number;
  distance: number;
  angle: number;
  color: string;
}

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [radarDots, setRadarDots] = useState<RadarDot[]>([]);
  const [scanAngle, setScanAngle] = useState(0);
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    
    // Generate random radar dots INSIDE the radar - only pink and blue
    const dots: RadarDot[] = [];
    const colors = ['#0096ff', '#ff0080']; // Blue and Pink only
    
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * 360;
      const distance = 20 + Math.random() * 25; // 20-45% from center (keeps dots well inside)
      const radians = angle * Math.PI / 180;
      
      dots.push({
        id: i,
        x: 50 + Math.cos(radians) * distance,
        y: 50 + Math.sin(radians) * distance,
        distance,
        angle,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    setRadarDots(dots);
  }, []);

  // Animate radar scan
  useEffect(() => {
    const interval = setInterval(() => {
      setScanAngle(prev => (prev + 2) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Draw radar on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw radar circles
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 3) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw crosshair
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();

    // Draw scanning line
    const scanRad = (scanAngle * Math.PI) / 180;
    const gradient = ctx.createLinearGradient(
      centerX,
      centerY,
      centerX + Math.cos(scanRad) * radius,
      centerY + Math.sin(scanRad) * radius
    );
    gradient.addColorStop(0, 'rgba(0, 150, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 150, 255, 0.8)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(scanRad) * radius,
      centerY + Math.sin(scanRad) * radius
    );
    ctx.stroke();

    // Draw scan arc (trail effect)
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.1)';
    ctx.lineWidth = radius;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius / 2, scanRad - 0.5, scanRad);
    ctx.stroke();

  }, [scanAngle]);

  const handleDotClick = () => {
    navigate('/register');
  };

  return (
    <div className="landing-page">
      <div className="grid-bg"></div>
      
      <div className={`content ${isVisible ? 'visible' : ''}`}>
        <div className="header-section">
          <div className="logo">
            <div className="logo-ring"></div>
            <div className="logo-pulse"></div>
          </div>

          <h1 className="title">
            Hive<span className="neon">Mate</span>
          </h1>

          <p className="subtitle">
            Discover professionals in your area
          </p>
        </div>

        {/* Interactive Radar */}
        <div className="radar-wrapper">
          <div className="radar-container" ref={radarRef}>
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={500}
              className="radar-canvas"
            />
            
            <div className="radar-dots">
              {radarDots.map(dot => (
                <div
                  key={dot.id}
                  className="radar-dot"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    backgroundColor: dot.color,
                    boxShadow: `0 0 20px ${dot.color}`,
                    animationDelay: `${dot.id * 0.1}s`
                  }}
                  onClick={handleDotClick}
                  onMouseEnter={() => setHoveredDot(dot.id)}
                  onMouseLeave={() => setHoveredDot(null)}
                >
                  {hoveredDot === dot.id && (
                    <div className="dot-tooltip">Unknown User</div>
                  )}
                </div>
              ))}
            </div>

            <div className="radar-center">
              <div className="center-pulse"></div>
            </div>
          </div>
          
          <div className="radar-label">Click any dot to connect</div>
        </div>

        <div className="buttons">
          <button className="btn-get-started" onClick={() => navigate('/register')}>
            Get Started
          </button>
          <button className="btn-sign-in" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            </div>
            <span>Real-Time Location</span>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <span>End-to-End Encrypted</span>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
            </div>
            <span>Professional Gigs</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
