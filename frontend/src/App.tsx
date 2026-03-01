import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { applyUpdate } from './utils/serviceWorkerRegistration';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import GlobalCallHandler from './components/GlobalCallHandler';
import './App.css';

// Eager load critical pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Eager load CreateProfilePage to avoid context issues
import CreateProfilePage from './pages/CreateProfilePage';
const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const CreateGigPage = lazy(() => import('./pages/CreateGigPage'));
const GigDetailPage = lazy(() => import('./pages/GigDetailPage'));
const EditGigPage = lazy(() => import('./pages/EditGigPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

// Loading component
const LoadingFallback = () => (
  <div className="app-loading-fallback">
    <div className="app-loading-inner">
      <div className="app-loading-spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
);

function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!localStorage.getItem('token')) return;
      if (document.visibilityState !== 'visible') return;
      window.dispatchEvent(new CustomEvent('hivemate:soft-refresh'));
    }, 7000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onUpdateAvailable = () => setUpdateAvailable(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        window.dispatchEvent(new CustomEvent('hivemate:soft-refresh'));
      }
    };
    const onFocus = () => {
      if (localStorage.getItem('token')) {
        window.dispatchEvent(new CustomEvent('hivemate:soft-refresh'));
      }
    };

    window.addEventListener('hivemate:update-available', onUpdateAvailable as EventListener);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('hivemate:update-available', onUpdateAvailable as EventListener);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        {updateAvailable && (
          <div className="app-update-banner" role="status" aria-live="polite">
            <span>New version available</span>
            <button
              type="button"
              className="app-update-btn"
              onClick={() => applyUpdate()}
            >
              Update now
            </button>
          </div>
        )}
        <Router>
          <GlobalCallHandler />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/create-profile" element={<CreateProfilePage />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/friends/:userId" element={<FriendsPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:friendshipId" element={<ChatPage />} />
              <Route path="/gig/create" element={<CreateGigPage />} />
              <Route path="/gig/:gigId" element={<GigDetailPage />} />
              <Route path="/gig/:gigId/edit" element={<EditGigPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
