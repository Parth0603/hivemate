import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SubscriptionPage.css';

interface Subscription {
  id: string;
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: string;
  endDate?: string;
}

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      } else {
        throw new Error('Failed to fetch subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setProcessing(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        alert('Subscription activated successfully! Video calls are now unlocked for all your conversations.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? Video call access will be removed unless your conversation partner has an active subscription.')) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        alert('Subscription cancelled successfully.');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="subscription-page">
        <div className="loading">Loading subscription details...</div>
      </div>
    );
  }

  const isPremium = subscription?.plan === 'premium' && subscription?.status === 'active';

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        <button className="back-button" onClick={() => navigate('/home')}>
          ← Back
        </button>
        <h1>Subscription</h1>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="subscription-content">
        {/* Current Status */}
        <div className="current-status">
          <h2>Current Plan</h2>
          <div className={`status-card ${subscription?.plan}`}>
            <div className="plan-badge">
              {subscription?.plan === 'premium' ? '⭐ Premium' : '🆓 Free'}
            </div>
            <div className="status-info">
              <p className="status-label">Status: <span className={`status-value ${subscription?.status}`}>{subscription?.status}</span></p>
              {subscription?.startDate && (
                <p className="status-label">Member since: <span className="status-value">{formatDate(subscription.startDate)}</span></p>
              )}
              {subscription?.endDate && isPremium && (
                <p className="status-label">Renews on: <span className="status-value">{formatDate(subscription.endDate)}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Premium Plan Details */}
        <div className="plan-details">
          <h2>Premium Plan</h2>
          <div className="plan-card">
            <div className="plan-header">
              <h3>SocialHive Premium</h3>
              <div className="plan-price">
                <span className="price">$9.99</span>
                <span className="period">/month</span>
              </div>
            </div>

            <div className="plan-features">
              <h4>Premium Features:</h4>
              <ul>
                <li>
                  <span className="feature-icon">📹</span>
                  <div className="feature-text">
                    <strong>Video Calling</strong>
                    <p>Unlock video calls for all your conversations. When you subscribe, both you and your conversation partners can use video calls.</p>
                  </div>
                </li>
                <li>
                  <span className="feature-icon">🎯</span>
                  <div className="feature-text">
                    <strong>Enhanced Networking</strong>
                    <p>Build stronger professional relationships with face-to-face video communication.</p>
                  </div>
                </li>
                <li>
                  <span className="feature-icon">🤝</span>
                  <div className="feature-text">
                    <strong>Shared Benefits</strong>
                    <p>Your subscription unlocks video calls for both you and your friends - they benefit too!</p>
                  </div>
                </li>
                <li>
                  <span className="feature-icon">💬</span>
                  <div className="feature-text">
                    <strong>All Free Features</strong>
                    <p>Keep all existing features: radar discovery, encrypted chat, voice calls, and gig collaboration.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="plan-actions">
              {!isPremium ? (
                <button
                  className="subscribe-button"
                  onClick={handleSubscribe}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Subscribe Now'}
                </button>
              ) : (
                <button
                  className="cancel-button"
                  onClick={handleCancel}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Cancel Subscription'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Free Plan Features */}
        {!isPremium && (
          <div className="free-features">
            <h3>Free Plan Includes:</h3>
            <ul>
              <li>📡 Radar-based professional discovery</li>
              <li>🔒 End-to-end encrypted messaging</li>
              <li>📞 Voice calls (after 2 interactions)</li>
              <li>💼 Gig posting and collaboration</li>
              <li>🔍 Advanced search and filtering</li>
              <li>👥 Unlimited connections</li>
            </ul>
          </div>
        )}

        {/* FAQ */}
        <div className="subscription-faq">
          <h3>Frequently Asked Questions</h3>
          <div className="faq-item">
            <h4>How does the shared benefit work?</h4>
            <p>When you subscribe to Premium, video calling is unlocked for all your conversations. This means both you and your friends can initiate video calls with each other, even if they don't have a Premium subscription.</p>
          </div>
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>Yes! You can cancel your subscription at any time. Your Premium features will remain active until the end of your current billing period.</p>
          </div>
          <div className="faq-item">
            <h4>What happens when I cancel?</h4>
            <p>If you cancel, video calling will be disabled for your conversations unless your conversation partner has an active Premium subscription. All other features remain available.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
