import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
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
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
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
