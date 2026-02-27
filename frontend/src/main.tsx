import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserCompatibility, ensureTextEncoderDecoder } from './utils/browserCompatibility';
import * as serviceWorkerRegistration from './utils/serviceWorkerRegistration';

// Initialize polyfills
ensureTextEncoderDecoder();

// Check browser compatibility
BrowserCompatibility.initialize();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker only in production.
// In development/tunnel mode, force unregister to avoid stale cached modules.
if (import.meta.env.PROD) {
  serviceWorkerRegistration.register();
} else {
  serviceWorkerRegistration.unregister();
}
