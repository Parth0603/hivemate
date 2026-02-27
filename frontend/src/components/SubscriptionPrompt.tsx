import { useNavigate } from 'react-router-dom';
import './SubscriptionPrompt.css';

interface SubscriptionPromptProps {
  onClose: () => void;
  feature?: string;
}

const SubscriptionPrompt = ({ onClose, feature = 'video calling' }: SubscriptionPromptProps) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate('/subscription');
    onClose();
  };

  return (
    <div className="subscription-prompt-overlay" onClick={onClose}>
      <div className="subscription-prompt" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>✕</button>
        
        <div className="prompt-icon">🔒</div>
        
        <h2>Unlock {feature}</h2>
        
        <p className="prompt-description">
          Upgrade to SocialHive Premium to unlock {feature} and enhance your professional networking experience.
        </p>

        <div className="premium-benefits">
          <h3>Premium Benefits:</h3>
          <ul>
            <li>
              <span className="benefit-icon">📹</span>
              <span>Video calls with all your connections</span>
            </li>
            <li>
              <span className="benefit-icon">🤝</span>
              <span>Your friends benefit too - shared video access</span>
            </li>
            <li>
              <span className="benefit-icon">🎯</span>
              <span>Build stronger professional relationships</span>
            </li>
            <li>
              <span className="benefit-icon">💬</span>
              <span>Keep all free features you already love</span>
            </li>
          </ul>
        </div>

        <div className="prompt-price">
          <span className="price-amount">$9.99</span>
          <span className="price-period">/month</span>
        </div>

        <div className="prompt-actions">
          <button className="upgrade-button" onClick={handleUpgrade}>
            Upgrade to Premium
          </button>
          <button className="maybe-later-button" onClick={onClose}>
            Maybe Later
          </button>
        </div>

        <p className="prompt-note">
          Cancel anytime. No long-term commitment required.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPrompt;
