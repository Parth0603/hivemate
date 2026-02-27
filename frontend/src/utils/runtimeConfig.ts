const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

export const getApiBaseUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  const envApi = envApiUrl && envApiUrl.trim() ? stripTrailingSlash(envApiUrl.trim()) : '';

  if (typeof window === 'undefined') {
    return envApi || 'http://localhost:5000';
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const host = window.location.hostname;
  const isDevTunnelHost = host.includes('devtunnels.ms');
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // If app is opened on localhost, prefer local backend to avoid stale tunnel URLs.
  if (isLocalHost) {
    return `${protocol}//${host}:5000`;
  }

  if (envApi) {
    return envApi;
  }

  // DevTunnel mapping: frontend host usually carries `-5173`, backend uses `-5000`.
  if (isDevTunnelHost && host.includes('-5173.')) {
    return `${protocol}//${host.replace('-5173.', '-5000.')}`;
  }

  // Local/dev fallback
  return `${protocol}//${host}:5000`;
};

export const getWsBaseUrl = (): string => {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  const envWs = envWsUrl && envWsUrl.trim() ? stripTrailingSlash(envWsUrl.trim()) : '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (isLocalHost) {
      return getApiBaseUrl();
    }
  }

  if (envWs) {
    const normalized = envWs;
    if (normalized.startsWith('ws://')) {
      return normalized.replace(/^ws:\/\//, 'http://');
    }
    if (normalized.startsWith('wss://')) {
      return normalized.replace(/^wss:\/\//, 'https://');
    }
    return normalized;
  }

  // socket.io client prefers http(s) origin.
  return getApiBaseUrl();
};
