/**
 * Browser Compatibility Utilities
 * Provides polyfills and compatibility checks for cross-browser support
 */

export class BrowserCompatibility {
  /**
   * Check if Web Crypto API is available
   */
  static isWebCryptoSupported(): boolean {
    return !!(window.crypto && window.crypto.subtle);
  }

  /**
   * Check if WebSocket is supported
   */
  static isWebSocketSupported(): boolean {
    return 'WebSocket' in window || 'MozWebSocket' in window;
  }

  /**
   * Check if WebRTC is supported
   */
  static isWebRTCSupported(): boolean {
    return !!(
      window.RTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      (window as any).webkitRTCPeerConnection
    );
  }

  /**
   * Check if getUserMedia is supported
   */
  static isGetUserMediaSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }

  /**
   * Check if IndexedDB is supported
   */
  static isIndexedDBSupported(): boolean {
    return 'indexedDB' in window;
  }

  /**
   * Check if localStorage is supported and accessible
   */
  static isLocalStorageSupported(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get normalized RTCPeerConnection constructor
   */
  static getRTCPeerConnection(): typeof RTCPeerConnection | null {
    return (
      window.RTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      null
    );
  }

  /**
   * Get normalized getUserMedia function
   */
  static getUserMedia(
    constraints: MediaStreamConstraints
  ): Promise<MediaStream> {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    // Fallback for older browsers
    const legacyGetUserMedia =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;

    if (legacyGetUserMedia) {
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, constraints, resolve, reject);
      });
    }

    return Promise.reject(new Error('getUserMedia is not supported'));
  }

  /**
   * Check browser and version
   */
  static getBrowserInfo(): {
    name: string;
    version: string;
    isSupported: boolean;
  } {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';
    let isSupported = true;

    // Chrome
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 90; // Chrome 90+ recommended
    }
    // Edge
    else if (ua.indexOf('Edg') > -1) {
      name = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 90; // Edge 90+ recommended
    }
    // Firefox
    else if (ua.indexOf('Firefox') > -1) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 88; // Firefox 88+ recommended
    }
    // Safari
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      isSupported = parseInt(version) >= 14; // Safari 14+ recommended
    }

    return { name, version, isSupported };
  }

  /**
   * Perform comprehensive compatibility check
   */
  static checkCompatibility(): {
    compatible: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Critical features
    if (!this.isWebCryptoSupported()) {
      issues.push('Web Crypto API is not supported. Encryption features will not work.');
    }

    if (!this.isWebSocketSupported()) {
      issues.push('WebSocket is not supported. Real-time features will not work.');
    }

    if (!this.isLocalStorageSupported()) {
      issues.push('localStorage is not supported or blocked. Authentication will not work.');
    }

    // Optional but important features
    if (!this.isWebRTCSupported()) {
      warnings.push('WebRTC is not supported. Voice and video calls will not work.');
    }

    if (!this.isGetUserMediaSupported()) {
      warnings.push('getUserMedia is not supported. Camera and microphone access will not work.');
    }

    if (!this.isIndexedDBSupported()) {
      warnings.push('IndexedDB is not supported. Some offline features may not work.');
    }

    // Browser version check
    const browserInfo = this.getBrowserInfo();
    if (!browserInfo.isSupported) {
      warnings.push(
        `Your browser (${browserInfo.name} ${browserInfo.version}) may not be fully supported. Please update to the latest version.`
      );
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Display compatibility warning to user
   */
  static showCompatibilityWarning(
    issues: string[],
    warnings: string[]
  ): void {
    if (issues.length === 0 && warnings.length === 0) {
      return;
    }

    const message = [];
    
    if (issues.length > 0) {
      message.push('Critical Issues:');
      issues.forEach(issue => message.push(`• ${issue}`));
    }

    if (warnings.length > 0) {
      if (issues.length > 0) message.push('');
      message.push('Warnings:');
      warnings.forEach(warning => message.push(`• ${warning}`));
    }

    console.warn('Browser Compatibility Check:\n' + message.join('\n'));

    // Show user-friendly alert for critical issues
    if (issues.length > 0) {
      alert(
        'Your browser may not support all features of this application.\n\n' +
        'Please use the latest version of Chrome, Firefox, Edge, or Safari for the best experience.'
      );
    }
  }

  /**
   * Initialize compatibility checks on app load
   */
  static initialize(): boolean {
    const result = this.checkCompatibility();
    
    if (!result.compatible || result.warnings.length > 0) {
      this.showCompatibilityWarning(result.issues, result.warnings);
    }

    return result.compatible;
  }
}

/**
 * Polyfill for TextEncoder/TextDecoder (for older browsers)
 */
export function ensureTextEncoderDecoder(): void {
  if (typeof TextEncoder === 'undefined') {
    (window as any).TextEncoder = class {
      encode(str: string): Uint8Array {
        const utf8: number[] = [];
        for (let i = 0; i < str.length; i++) {
          let charcode = str.charCodeAt(i);
          if (charcode < 0x80) utf8.push(charcode);
          else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
          } else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(
              0xe0 | (charcode >> 12),
              0x80 | ((charcode >> 6) & 0x3f),
              0x80 | (charcode & 0x3f)
            );
          } else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            utf8.push(
              0xf0 | (charcode >> 18),
              0x80 | ((charcode >> 12) & 0x3f),
              0x80 | ((charcode >> 6) & 0x3f),
              0x80 | (charcode & 0x3f)
            );
          }
        }
        return new Uint8Array(utf8);
      }
    };
  }

  if (typeof TextDecoder === 'undefined') {
    (window as any).TextDecoder = class {
      decode(bytes: Uint8Array): string {
        let str = '';
        for (let i = 0; i < bytes.length; i++) {
          str += String.fromCharCode(bytes[i]);
        }
        return decodeURIComponent(escape(str));
      }
    };
  }
}
