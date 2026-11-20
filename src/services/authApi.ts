import { UserProfile, AuthResponse } from '../types';

const LEGACY_TOKEN_KEY = 'markdown_studio_auth_token_v1';

// Keep Bearer token strictly in JS memory; persistent session lives in HttpOnly cookie (`ms_session`).
let memoryToken: string | null = null;

function clearLegacyTokenStorage() {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

clearLegacyTokenStorage();

export const authApi = {
  getToken(): string | null {
    return memoryToken;
  },

  setToken(token: string) {
    memoryToken = token || null;
    clearLegacyTokenStorage();
  },

  removeToken() {
    memoryToken = null;
    clearLegacyTokenStorage();
  },

  getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
    };
  },

  async getAuthConfig(): Promise<{ googleClientId: string }> {
    const res = await fetch('/api/auth/config', {
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!res.ok) {
      return { googleClientId: '' };
    }
    const data = await res.json().catch(() => ({}));
    return {
      googleClientId: typeof data.googleClientId === 'string' ? data.googleClientId.trim() : '',
    };
  },

  async loginWithGoogle(params: {
    accessToken?: string;
    credential?: string;
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در احراز هویت با حساب گوگل');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async register(params: {
    username: string;
    password: string;
    displayName?: string;
    email?: string;
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ثبت‌نام کاربر');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async login(params: {
    emailOrUsername: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ورود به حساب');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getMe(): Promise<UserProfile | null> {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          this.removeToken();
        }
        return null;
      }
      const data = await res.json().catch(() => ({}));
      return data.user || null;
    } catch {
      return null;
    }
  },

  async updateProfile(params: {
    displayName?: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<UserProfile> {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در بروزرسانی پروفایل');
    }
    return data.user;
  },

  async getMyDocuments(): Promise<any[]> {
    const res = await fetch('/api/auth/my-documents', {
      credentials: 'same-origin',
      headers: this.getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت اسناد');
    }
    return data.files || [];
  },

  async logout(): Promise<void> {
    this.removeToken();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
    } catch {
      // Best-effort server cookie clear
    }
  },
};
