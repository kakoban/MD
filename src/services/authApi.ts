import { UserProfile, AuthResponse } from '../types';

const TOKEN_KEY = 'markdown_studio_auth_token_v1';

export const authApi = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to save auth token', e);
    }
  },

  removeToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },

  getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async register(params: {
    username: string;
    password: string;
    displayName?: string;
    email?: string;
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ورود به حساب');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async sendEmailCode(email: string): Promise<{
    success: boolean;
    message: string;
    devCode?: string;
    emailSentToInbox?: boolean;
  }> {
    const res = await fetch('/api/auth/send-email-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ارسال کد تأیید');
    }
    return data;
  },

  async verifyEmailCode(params: {
    email: string;
    code: string;
    displayName?: string;
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/verify-email-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در بررسی کد تأیید');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async googleAuthorize(params: {
    email: string;
    displayName?: string;
    avatarUrl?: string;
  }): Promise<AuthResponse> {
    const res = await fetch('/api/auth/google-authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در اتورایز با حساب گوگل');
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getMe(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          this.removeToken();
        }
        return null;
      }
      const data = await res.json();
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
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در بروزرسانی پروفایل');
    }
    return data.user;
  },

  async getMyDocuments(): Promise<any[]> {
    const res = await fetch('/api/auth/my-documents', {
      headers: this.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت اسناد');
    }
    return data.files || [];
  },

  logout() {
    this.removeToken();
  },
};
