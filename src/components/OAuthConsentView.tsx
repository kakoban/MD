import React, { useEffect, useMemo, useState } from 'react';
import {
  PlugZap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderTree,
  FileEdit,
  Search,
  Lock,
  LogIn,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserProfile } from '../types';
import { authApi } from '../services/authApi';

interface OAuthConsentViewProps {
  currentUser: UserProfile | null;
  onAuthenticated: (user: UserProfile) => void;
}

interface OAuthClientInfo {
  clientId: string;
  clientName: string;
  redirectUri: string;
  redirectHost: string;
  scope: string;
  pkceProtected: boolean;
}

const BUILD_TIME_GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

function isSafeCallbackRedirect(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'https:') return true;
    if (
      parsed.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    ) {
      return true;
    }
    if (
      /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol) &&
      !['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'http:'].includes(parsed.protocol)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const OAuthConsentView: React.FC<OAuthConsentViewProps> = ({
  currentUser,
  onAuthenticated,
}) => {
  const oauthParams = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return {
      client_id: sp.get('client_id') || '',
      redirect_uri: sp.get('redirect_uri') || '',
      response_type: sp.get('response_type') || 'code',
      state: sp.get('state') || '',
      code_challenge: sp.get('code_challenge') || '',
      code_challenge_method: sp.get('code_challenge_method') || 'S256',
      scope: sp.get('scope') || 'mcp:tools',
    };
  }, []);

  const [clientInfo, setClientInfo] = useState<OAuthClientInfo | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Inline Login State when user is not yet signed in
  const [googleClientId, setGoogleClientId] = useState(BUILD_TIME_GOOGLE_CLIENT_ID);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({
      client_id: oauthParams.client_id,
      redirect_uri: oauthParams.redirect_uri,
      response_type: oauthParams.response_type,
      code_challenge: oauthParams.code_challenge,
      code_challenge_method: oauthParams.code_challenge_method,
      scope: oauthParams.scope,
    });

    fetch(`/api/oauth/client-info?${qs.toString()}`, { credentials: 'same-origin' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'درخواست اتصال OAuth معتبر نیست.');
        }
        if (!cancelled) {
          setClientInfo(data as OAuthClientInfo);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setClientError(err?.message || 'خطا در بررسی درخواست اتصال');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingClient(false);
      });

    if (!BUILD_TIME_GOOGLE_CLIENT_ID) {
      authApi
        .getAuthConfig()
        .then((cfg) => {
          if (!cancelled && cfg.googleClientId) setGoogleClientId(cfg.googleClientId);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [oauthParams]);

  const handleGoogleLogin = async () => {
    setActionError(null);
    let activeClientId = googleClientId.trim();
    if (!activeClientId) {
      const cfg = await authApi.getAuthConfig().catch(() => ({ googleClientId: '' }));
      activeClientId = cfg.googleClientId.trim();
      if (activeClientId) setGoogleClientId(activeClientId);
    }
    if (!activeClientId) {
      setActionError('شناسه گوگل روی سرور تنظیم نشده است. لطفاً با نام کاربری و رمز عبور وارد شوید.');
      setShowPasswordLogin(true);
      return;
    }

    setIsGoogleLoading(true);
    const start = Date.now();
    while (Date.now() - start < 2500 && !window.google?.accounts?.oauth2?.initTokenClient) {
      await new Promise((r) => setTimeout(r, 120));
    }

    if (!window.google?.accounts?.oauth2?.initTokenClient) {
      setIsGoogleLoading(false);
      setActionError('سرویس ورود گوگل در دسترس نیست. می‌توانید با نام کاربری و رمز عبور وارد شوید.');
      setShowPasswordLogin(true);
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error || !tokenResponse?.access_token) {
            setIsGoogleLoading(false);
            setActionError(tokenResponse?.error_description || 'ورود با گوگل تکمیل نشد.');
            return;
          }
          try {
            const res = await authApi.loginWithGoogle({
              accessToken: tokenResponse.access_token,
            });
            if (res.user) {
              onAuthenticated(res.user);
            }
          } catch (err: any) {
            setActionError(err?.message || 'خطا در ورود با حساب گوگل');
          } finally {
            setIsGoogleLoading(false);
          }
        },
        error_callback: () => {
          setIsGoogleLoading(false);
          setActionError('پنجره ورود گوگل بسته شد یا با خطا مواجه شد.');
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch {
      setIsGoogleLoading(false);
      setActionError('خطا در باز کردن پنجره ورود گوگل');
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!emailOrUsername.trim() || !password) {
      setActionError('نام کاربری/ایمیل و رمز عبور را وارد کنید.');
      return;
    }
    setIsPasswordLoading(true);
    try {
      const res = await authApi.login({
        emailOrUsername: emailOrUsername.trim(),
        password,
      });
      if (res.user) {
        onAuthenticated(res.user);
      }
    } catch (err: any) {
      setActionError(err?.message || 'نام کاربری یا رمز عبور نادرست است.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDecision = async (decision: 'approve' | 'deny') => {
    if (!clientInfo) return;
    setActionError(null);
    setIsSubmittingDecision(true);
    try {
      const res = await fetch('/api/oauth/approve', {
        method: 'POST',
        credentials: 'same-origin',
        headers: authApi.getAuthHeaders(),
        body: JSON.stringify({
          client_id: oauthParams.client_id,
          redirect_uri: oauthParams.redirect_uri,
          state: oauthParams.state,
          code_challenge: oauthParams.code_challenge,
          code_challenge_method: oauthParams.code_challenge_method,
          scope: oauthParams.scope,
          decision,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirectUrl) {
        throw new Error(data.error || 'خطا در صدور مجوز اتصال');
      }
      if (!isSafeCallbackRedirect(data.redirectUrl)) {
        throw new Error('آدرس بازگشت نامعتبر است.');
      }
      window.location.assign(data.redirectUrl);
    } catch (err: any) {
      setActionError(err?.message || 'خطا در تکمیل اتصال');
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-primary)] text-[var(--text-primary)]"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <PlugZap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-[var(--text-primary)]">
              اتصال ابزار هوش مصنوعی به حافظه شما
            </h1>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              استودیو مارک‌دان · احراز هویت امن OAuth 2.1
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {isLoadingClient ? (
            <div className="py-10 flex flex-col items-center gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              <span className="text-xs">در حال بررسی درخواست اتصال...</span>
            </div>
          ) : clientError || !clientInfo ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{clientError || 'درخواست اتصال نامعتبر است.'}</span>
              </div>
              <a
                href="/"
                className="block w-full text-center py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
              >
                بازگشت به استودیو مارک‌دان
              </a>
            </div>
          ) : (
            <>
              {/* Requesting Client Summary */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1.5">
                <div className="text-[11px] text-[var(--text-muted)]">درخواست دسترسی از طرف:</div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {clientInfo.clientName}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono truncate" dir="ltr">
                  {clientInfo.redirectHost}
                </div>
              </div>

              {/* Requested Permissions */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  دسترسی‌های درخواستی:
                </div>
                <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <FolderTree className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <span>مشاهده، ساخت و سازماندهی پوشه‌ها و زیرپوشه‌های حافظه شما</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileEdit className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <span>ایجاد، خواندن، ویرایش و انتقال فایل‌های مارک‌دان اختصاصی شما</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Search className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                    <span>جستجو در یادداشت‌ها و منابع حافظه همین حساب کاربری</span>
                  </li>
                </ul>
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {!currentUser ? (
                /* Step A: Sign in first */
                <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    برای تأیید این اتصال، ابتدا وارد حساب کاربری استودیو مارک‌دان خود شوید:
                  </p>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-color)] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-60"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>ورود سریع با حساب گوگل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasswordLogin((v) => !v)}
                    className="w-full py-2 px-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between cursor-pointer"
                  >
                    <span>ورود با نام کاربری و رمز عبور</span>
                    {showPasswordLogin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showPasswordLogin && (
                    <form onSubmit={handlePasswordLogin} className="space-y-2.5 pt-1">
                      <input
                        type="text"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        placeholder="ایمیل یا نام کاربری"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="رمز عبور"
                        className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="submit"
                        disabled={isPasswordLoading}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {isPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                        <span>ورود به حساب</span>
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Step B: Approve or Deny */
                <div className="space-y-4 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-color)] text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-[var(--text-primary)] truncate">
                        {currentUser.displayName}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate" dir="ltr">
                        {currentUser.email && !currentUser.email.endsWith('@local.user')
                          ? currentUser.email
                          : `@${currentUser.username}`}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmittingDecision}
                      onClick={() => handleDecision('approve')}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent-color)] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-opacity cursor-pointer disabled:opacity-60"
                    >
                      {isSubmittingDecision ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span>تأیید و اتصال</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingDecision}
                      onClick={() => handleDecision('deny')}
                      className="px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      انصراف
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] text-center leading-relaxed">
                    هر زمان می‌توانید این دسترسی را از بخش «حافظه MCP و کامپیوتر» لغو کنید.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
