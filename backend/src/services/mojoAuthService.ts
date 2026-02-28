const MOJOAUTH_BASE_URL = process.env.MOJOAUTH_BASE_URL || 'https://api.mojoauth.com';
const MOJOAUTH_API_KEY = process.env.MOJOAUTH_API_KEY || '';
const MOJOAUTH_API_SECRET = process.env.MOJOAUTH_API_SECRET || '';

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': MOJOAUTH_API_KEY
  };

  if (MOJOAUTH_API_SECRET) {
    headers['X-API-Secret'] = MOJOAUTH_API_SECRET;
  }

  return headers;
};

export class MojoAuthService {
  static isConfigured(): boolean {
    return Boolean(MOJOAUTH_API_KEY);
  }

  static async sendEmailOtp(email: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('MojoAuth is not configured. Set MOJOAUTH_API_KEY.');
    }

    const response = await fetch(`${MOJOAUTH_BASE_URL}/users/emailotp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MojoAuth send OTP failed: ${response.status} ${text}`);
    }

    const data: any = await response.json();
    const stateId = data?.state_id || data?.stateId || data?.state;
    if (!stateId) {
      throw new Error('MojoAuth did not return state_id');
    }

    return stateId;
  }

  static async verifyEmailOtp(otp: string, stateId: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('MojoAuth is not configured. Set MOJOAUTH_API_KEY.');
    }

    const response = await fetch(`${MOJOAUTH_BASE_URL}/users/emailotp/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        otp,
        state_id: stateId
      })
    });

    if (!response.ok) {
      return false;
    }

    const data: any = await response.json().catch(() => ({}));
    // MojoAuth returns user/token payload on success.
    return Boolean(data);
  }
}
