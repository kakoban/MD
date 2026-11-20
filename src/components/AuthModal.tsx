import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  UserPlus,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { UserProfile } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

const BUILD_TIME_GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [googleClientId, setGoogleClientId] = useState<string>(BUILD_TIME_GOOGLE_CLIENT_ID);
  const [isConfigLoading, setIsConfigLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  // Secondary password login/register accordion
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);
  const [passwordMode, setPasswordMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const [isPasswordLoading, setIsPasswordLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);

    if (BUILD_TIME_GOOGLE_CLIENT_ID) {
      setGoogleClientId(BUILD_TIME_GOOGLE_CLIENT_ID);
      return;
    }

    let cancelled = false;
    setIsConfigLoading(true);
    authApi
      .getAuthConfig()
      .then((cfg) => {
        if (!cancelled && cfg.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const waitForGoogleOauth = async (timeoutMs = 2500): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return Boolean(window.google?.accounts?.oauth2?.initTokenClient);
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);

    let activeClientId = googleClientId.trim();
    if (!activeClientId) {
      const cfg = await authApi.getAuthConfig().catch(() => ({ googleClientId: '' }));
      activeClientId = cfg.googleClientId.trim();
      if (activeClientId) {
        setGoogleClientId(activeClientId);
      }
    }

    if (!activeClientId) {
      setErrorMessage(
        'شناسه گوگل (VITE_GOOGLE_CLIENT_ID) هنوز در تنظیمات سرور ثبت نشده است. لطفاً مقدار آن را در متغیرهای محیطی قرار دهید و آدرس فعلی سایت را در Google Cloud Console ثبت کنید.'
      );
      return;
    }

    setIsGoogleLoading(true);
    const gisReady = await waitForGoogleOauth();
    if (!gisReady || !window.google?.accounts?.oauth2) {
      setIsGoogleLoading(false);
      setErrorMessage(
        'اسکریپت احراز هویت گوگل بارگذاری نشد. اتصال اینترنت یا فیلترشکن را بررسی کرده و دوباره تلاش کنید.'
      );
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error || !tokenResponse?.access_token) {
            setIsGoogleLoading(false);
            if (tokenResponse?.error === 'access_denied') {
              setErrorMessage('دسترسی به حساب گوگل لغو شد.');
            } else {
              setErrorMessage(
                tokenResponse?.error_description || 'احراز هویت با گوگل تکمیل نشد.'
              );
            }
            return;
          }

          try {
            const res = await authApi.loginWithGoogle({
              accessToken: tokenResponse.access_token,
            });
            if (res.user) {
              onSuccess(res.user);
              onClose();
            } else {
              setErrorMessage('پاسخ معتبری از سرور دریافت نشد.');
            }
          } catch (err: any) {
            setErrorMessage(err?.message || 'خطا در تأیید حساب گوگل روی سرور.');
          } finally {
            setIsGoogleLoading(false);
          }
        },
        error_callback: (err) => {
          setIsGoogleLoading(false);
          if (err?.type === 'popup_closed') {
            setErrorMessage('پنجره ورود گوگل بسته شد.');
          } else if (err?.type === 'popup_failed_to_open') {
            setErrorMessage('مرورگر اجازه باز شدن پنجره ورود گوگل (Popup) را نداد. لطفاً Popup را برای این سایت مجاز کنید.');
          } else {
            setErrorMessage('امکان باز کردن پنجره ورود گوگل فراهم نشد.');
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch {
      setIsGoogleLoading(false);
      setErrorMessage('خطا در شروع فرآیند ورود با گوگل.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPasswordLoading(true);

    try {
      if (passwordMode === 'login') {
        if (!emailOrUsername.trim() || !password) {
          throw new Error('لطفاً ایمیل یا نام کاربری و رمز عبور را وارد کنید.');
        }
        const res = await authApi.login({
          emailOrUsername: emailOrUsername.trim(),
          password,
        });
        if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      } else {
        if (!displayName.trim()) {
          throw new Error('لطفاً نام نمایشی خود را وارد کنید.');
        }
        if (!username.trim() || username.trim().length < 3) {
          throw new Error('نام کاربری باید حداقل ۳ کاراکتر انگلیسی باشد.');
        }
        if (email.trim() && !email.includes('@')) {
          throw new Error('لطفاً یک آدرس ایمیل معتبر وارد کنید.');
        }
        if (!password || password.length < 6) {
          throw new Error('رمز عبور باید حداقل ۶ کاراکتر باشد.');
        }

        const res = await authApi.register({
          username: username.trim(),
          displayName: displayName.trim(),
          password,
          email: email.trim() || undefined,
        });
        if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                ورود به فضای کار اختصاصی
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                احراز هویت سریع و مستقیم با حساب گوگل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in duration-150 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Google Sign-In CTA */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isConfigLoading}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-neutral-950 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال اتصال به گوگل...</span>
                </>
              ) : (
                <>
                  <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </span>
                  <span>ورود با حساب گوگل</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-[var(--text-muted)] leading-relaxed">
              با انتخاب حساب جیمیل، هویت شما مستقیم توسط گوگل تأیید شده و به اسناد شخصی خود وارد می‌شوید.
            </p>

            {!isConfigLoading && !googleClientId && (
              <div className="p-3 rounded-2xl bg-[var(--bg-tertiary)]/70 border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] space-y-1.5 leading-relaxed">
                <p className="font-semibold text-[var(--text-primary)]">
                  راهنمای فعال‌سازی ورود با گوگل:
                </p>
                <p>
                  متغیر <code className="font-mono text-amber-500">VITE_GOOGLE_CLIENT_ID</code> را در تنظیمات سرور ثبت کنید و این نشانی را در بخش Authorized JavaScript Origins گوگل اضافه نمایید:
                </p>
                {currentOrigin && (
                  <div
                    dir="ltr"
                    className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-[11px] text-[var(--text-primary)] select-all truncate"
                  >
                    {currentOrigin}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secondary Password Login / Register Collapsible */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                setShowPasswordSection((prev) => !prev);
                setErrorMessage(null);
              }}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/60 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>ورود یا ثبت‌نام با نام کاربری و رمز عبور</span>
              {showPasswordSection ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showPasswordSection && (
              <div className="mt-3 space-y-3 animate-in fade-in duration-150">
                <div className="flex p-1 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode('login');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      passwordMode === 'login'
                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>ورود</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordMode('register');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      passwordMode === 'register'
                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>ثبت‌نام</span>
                  </button>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  {passwordMode === 'register' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          نام و نام خانوادگی
                        </label>
                        <div className="relative">
                          <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="مثال: علی رضایی"
                            className="w-full ps-10 pe-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          نام کاربری (انگلیسی)
                        </label>
                        <div className="relative">
                          <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">@</span>
                          <input
                            type="text"
                            required
                            dir="ltr"
                            value={username}
                            onChange={(e) =>
                              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                            }
                            placeholder="ali_rezaei"
                            className="w-full ps-9 pe-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                            آدرس ایمیل
                          </label>
                          <span className="text-[10px] text-neutral-400">(اختیاری)</span>
                        </div>
                        <div className="relative">
                          <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <input
                            type="email"
                            dir="ltr"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full ps-10 pe-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        ایمیل یا نام کاربری
                      </label>
                      <div className="relative">
                        <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="text"
                          required
                          dir="ltr"
                          value={emailOrUsername}
                          onChange={(e) => setEmailOrUsername(e.target.value)}
                          placeholder="name@example.com یا username"
                          className="w-full ps-10 pe-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      رمز عبور
                    </label>
                    <div className="relative">
                      <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        dir="ltr"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="حداقل ۶ کاراکتر"
                        className="w-full ps-10 pe-10 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPasswordLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] disabled:opacity-50 text-[var(--text-primary)] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isPasswordLoading ? (
                      <span>در حال اتصال...</span>
                    ) : passwordMode === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>ورود به حساب</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ثبت‌نام و ورود</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
