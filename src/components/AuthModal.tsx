import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'reset';
  resetToken?: string | null;
}

declare global {
  interface Window {
    google?: any;
  }
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
);

// Helper to decode Google JWT
const parseGoogleCredential = (credentialToken: string) => {
  try {
    const base64Url = credentialToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding Google JWT credential:', e);
    return null;
  }
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  resetToken = null,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(
    resetToken ? 'reset' : initialMode
  );
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Google Client ID (from .env or user provided credentials)
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '507287937639-pidlnbp3c3i6judh7jn1152p7rb9kp5b.apps.googleusercontent.com';

  // Verification waiting state
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Forgot password states
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  // Successful Google Login Handler
  const handleGoogleSuccess = async (googleUser: {
    googleId?: string;
    email: string;
    name?: string;
    picture?: string;
  }) => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await authApi.loginWithGoogle({
        googleId: googleUser.googleId,
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
      });

      if (res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ورود با حساب گوگل.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Initialize official Google Identity Services if client_id is set
  useEffect(() => {
    if (!isOpen || !googleClientId) return;

    const initGsi = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) {
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response.credential) {
              const payload = parseGoogleCredential(response.credential);
              if (payload && payload.email) {
                handleGoogleSuccess({
                  googleId: payload.sub,
                  email: payload.email,
                  name: payload.name || payload.given_name,
                  picture: payload.picture,
                });
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleButtonContainerRef.current) {
          googleButtonContainerRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'center',
            width: 370,
          });
        }
      } catch (e) {
        console.warn('Google Identity Services notice:', e);
      }
    };

    const timer = setTimeout(initGsi, 300);
    return () => clearTimeout(timer);
  }, [isOpen, googleClientId]);

  if (!isOpen) return null;

  // Handle click on "Continue with Google" -> Opens REAL accounts.google.com popup
  const handleGoogleButtonClick = () => {
    setErrorMessage(null);

    // If Google GIS script is still loading
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      setErrorMessage('در حال اتصال به سرورهای گوگل... لطفاً لحظاتی دیگر مجدداً کلیک کنید.');
      return;
    }

    try {
      setIsGoogleLoading(true);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setIsGoogleLoading(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              setErrorMessage('ورود گوگل لغو شد یا دسترسی تأیید نشد.');
            }
            return;
          }
          if (tokenResponse.access_token) {
            try {
              // Real Google userinfo from official Google API
              const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const profile = await userinfoRes.json();
              if (profile.email) {
                await handleGoogleSuccess({
                  googleId: profile.sub || profile.id,
                  email: profile.email,
                  name: profile.name || profile.given_name,
                  picture: profile.picture,
                });
              }
            } catch {
              setErrorMessage('خطا در دریافت مشخصات حساب از سرور گوگل.');
            } finally {
              setIsGoogleLoading(false);
            }
          }
        },
      });

      // Opens the REAL Google account chooser popup window
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (e: any) {
      setIsGoogleLoading(false);
      setErrorMessage('خطا در باز کردن پنجره رسمی ورود گوگل.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setForgotSuccess(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('لطفاً یک آدرس ایمیل معتبر وارد کنید.');
      return;
    }

    // Mode: Forgot Password
    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        const res = await authApi.forgotPassword(cleanEmail);
        setForgotSuccess(res.message);
      } catch (err: any) {
        setErrorMessage(err.message || 'خطا در ثبت درخواست بازیابی.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Mode: Reset Password
    if (mode === 'reset') {
      if (!resetToken) {
        setErrorMessage('توکن بازیابی رمز معتبر نیست.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('رمز عبور جدید باید حداقل ۶ کاراکتر باشد.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('رمز عبور و تکرار آن یکسان نیستند.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await authApi.resetPassword({
          token: resetToken,
          newPassword: password,
        });
        if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'خطا در تغییر رمز عبور.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Modes: Login or Register
    if (!password || password.length < 6) {
      setErrorMessage('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await authApi.login({
          emailOrUsername: cleanEmail,
          password,
        });
        if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      } else {
        const autoUsername =
          cleanEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '') ||
          `user${Date.now().toString().slice(-4)}`;
        const res = await authApi.register({
          email: cleanEmail,
          username: autoUsername,
          displayName: autoUsername,
          password,
        });

        if (res.requiresVerification) {
          setRegisteredEmail(cleanEmail);
          setIsAwaitingVerification(true);
        } else if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setIsLoading(true);
    setResendStatus(null);
    try {
      const res = await authApi.resendVerification(registeredEmail);
      setResendStatus(res.message || 'ایمیل مجدداً ارسال شد.');
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ارسال مجدد ایمیل.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] bg-white border border-[#e5e5e5] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0061FF] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              M
            </div>
            <span className="font-bold text-sm text-[#1a1a1a]">DocSend / MD Studio</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 text-[#6b7280] hover:text-[#1a1a1a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Screen */}
        {isAwaitingVerification ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[#0061FF] flex items-center justify-center mx-auto">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#1a1a1a]">
                پیوند فعال‌سازی به ایمیل شما ارسال شد
              </h3>
              <p className="text-xs text-[#6b7280]">
                پیوند تأیید به آدرس{' '}
                <strong className="text-[#0061FF] font-mono dir-ltr">{registeredEmail}</strong>{' '}
                ارسال گردید.
              </p>
            </div>

            {resendStatus && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{resendStatus}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleResend}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#e5e5e5] hover:bg-[#f7f7f8] text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>ارسال مجدد ایمیل</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-1.5 text-xs text-[#6b7280] hover:text-[#1a1a1a]"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        ) : mode === 'forgot' ? (
          /* Forgot Password Mode */
          <div className="p-6">
            {forgotSuccess ? (
              <div className="text-center space-y-4 py-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-[#1a1a1a]">
                  پیوند بازیابی رمز ارسال شد!
                </h3>
                <p className="text-xs text-[#6b7280]">
                  لطفاً صندوق ورودی ایمیل خود را بررسی نمایید.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSuccess(null);
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#0061FF] hover:bg-[#0050d4] text-white font-bold text-xs transition-colors"
                >
                  بازگشت به صفحه ورود
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-xs text-[#6b7280] leading-relaxed">
                  آدرس ایمیل متصل به حساب خود را وارد کنید تا پیوند تغییر رمز برای شما ارسال شود:
                </p>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    آدرس ایمیل
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#e5e5e5] focus:border-[#0061FF] focus:outline-none text-xs text-[#1a1a1a] font-mono transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0061FF] hover:bg-[#0050d4] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                >
                  {isLoading ? <span>در حال ارسال...</span> : <span>ارسال پیوند بازیابی</span>}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-[#0061FF] hover:underline font-semibold"
                  >
                    انصراف و بازگشت به ورود
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* DocSend Authentic Sign Up / Login Screen */
          <div className="p-6 space-y-4">
            <div className="text-center space-y-1 pb-1">
              <h1 className="text-xl font-bold text-[#1a1a1a]">
                ورود یا ساخت حساب کاربری
              </h1>
              <p className="text-xs text-[#6b7280]">
                دسترسی سریع و امن به محیط استودیو DocSend
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Official Google Identity Services Container or Clean Google Button */}
            <div className="space-y-2">
              <div ref={googleButtonContainerRef} className="flex justify-center" />

              {/* Standard Google Button */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleButtonClick}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-neutral-50 border border-[#dadce0] text-[#3c4043] font-semibold text-xs transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-[0.99]"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0061FF]" />
                ) : (
                  <GoogleIcon />
                )}
                <span>
                  {isGoogleLoading ? 'در حال ورود...' : 'Continue with Google (ورود با حساب گوگل)'}
                </span>
              </button>
            </div>

            {/* 2. Divider: --- یا با ایمیل --- */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-[#e5e5e5] w-full" />
              <span className="bg-white px-3 text-[11px] text-[#9ca3af] shrink-0 font-medium">
                یا با ایمیل و رمز عبور
              </span>
            </div>

            {/* 3. Streamlined Email and Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  ایمیل (Email)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    dir="ltr"
                    className="w-full ps-9 pe-3 py-2.5 rounded-lg bg-white border border-[#e5e5e5] focus:border-[#0061FF] focus:outline-none text-xs text-[#1a1a1a] font-mono transition-colors"
                  />
                  <Mail className="w-4 h-4 text-[#9ca3af] absolute start-3 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#374151]">
                    رمز عبور
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage(null);
                      }}
                      className="text-[11px] text-[#0061FF] hover:underline font-semibold cursor-pointer"
                    >
                      فراموشی رمز؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="w-full ps-9 pe-9 py-2.5 rounded-lg bg-white border border-[#e5e5e5] focus:border-[#0061FF] focus:outline-none text-xs text-[#1a1a1a] font-mono transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[#9ca3af] absolute start-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded text-[#9ca3af] hover:text-[#1a1a1a] absolute end-2.5 top-2.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#0061FF] hover:bg-[#0050d4] disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs cursor-pointer mt-1"
              >
                {isLoading ? (
                  <span>در حال پردازش...</span>
                ) : mode === 'login' ? (
                  <span>ورود به حساب</span>
                ) : (
                  <span>ثبت‌نام و ورود</span>
                )}
              </button>
            </form>

            {/* Toggle Login / Register switch */}
            <div className="text-center text-xs text-[#6b7280] pt-1">
              {mode === 'login' ? (
                <p>
                  حساب کاربری ندارید؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                    }}
                    className="text-[#0061FF] hover:underline font-bold cursor-pointer"
                  >
                    ثبت‌نام با ایمیل
                  </button>
                </p>
              ) : (
                <p>
                  قبلاً ثبت‌نام کرده‌اید؟{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-[#0061FF] hover:underline font-bold cursor-pointer"
                  >
                    وارد شوید
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-2.5 border-t border-[#e5e5e5] bg-[#fafafa] text-center text-[10px] text-[#9ca3af]">
          با ورود، قوانین و حریم خصوصی پلتفرم را می‌پذیرید.
        </div>
      </div>
    </div>
  );
};
