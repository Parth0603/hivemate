let googleIdentityLoadPromise: Promise<void> | null = null;

const SCRIPT_SELECTOR = 'script[data-google-identity="true"]';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface GoogleCredentialResponse {
    credential: string;
  }

  interface GoogleIdentityIdApi {
    initialize: (options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
  }

  interface GoogleAccountsApi {
    id: GoogleIdentityIdApi;
  }

  interface Window {
    google?: {
      accounts?: GoogleAccountsApi;
    };
  }
}

const waitForGoogleApi = (timeoutMs = 15000): Promise<void> =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Google Identity API not ready before timeout'));
        return;
      }

      window.setTimeout(check, 100);
    };

    check();
  });

export const loadGoogleIdentityScript = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity can only be loaded in browser'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (googleIdentityLoadPromise) {
    return googleIdentityLoadPromise;
  }

  googleIdentityLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(SCRIPT_SELECTOR) as HTMLScriptElement | null;

    const handleReady = () => {
      waitForGoogleApi()
        .then(resolve)
        .catch((error) => {
          googleIdentityLoadPromise = null;
          reject(error);
        });
    };

    const handleError = () => {
      googleIdentityLoadPromise = null;
      reject(new Error('Failed to load Google Identity script'));
    };

    if (existing) {
      existing.addEventListener('load', handleReady, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      // Covers case where script is already loaded before listeners were attached.
      window.setTimeout(handleReady, 0);
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.addEventListener('load', handleReady, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return googleIdentityLoadPromise;
};
