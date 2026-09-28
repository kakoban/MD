import React, { useState } from 'react';
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
  Sparkles,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  RotateCcw,
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'email-otp' | 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'email-otp',
}) => {
  const [mode, setMode] = useState<'email-otp' | 'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP states
  const [emailOtp, setEmailOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'input-email' | 'enter-code'>('input-email');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [devReceivedCode, setDevReceivedCode] = useState<string | null>(null);
  const [otpDisplayName, setOtpDisplayName] = useState('');

  // Google direct authorization states
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Password / Form states
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Send OTP Code to Email
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailOtp.trim() || !emailOtp.includes('@')) {
      setErrorMessage('لطفاً یک آدرس ایمیل معتبر (مانند user@gmail.com) وارد کنید.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.sendEmailCode(emailOtp.trim());
      setOtpStep('enter-code');
      setOtpNotice(`کد اتورایز ۶ رقمی به نشانی ${emailOtp.trim()} ارسال شد.`);
      setOtpCode(''); // Require user to enter the code!
      if (res.devCode) {
        setDevReceivedCode(res.devCode);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ارسال کد به ایمیل.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP Code & Authorize User
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('لطفاً کد ۶ رقمی اتورایز را وارد نمایید.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await authApi.verifyEmailCode({
        email: emailOtp.trim(),
        code: otpCode.trim(),
        displayName: otpDisplayName.trim() || undefined,
      });
      if (res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'کد واردشده نادرست یا منقضی است.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick Google Account Email Authorization (Sends OTP code to Gmail!)
  const handleGoogleAuthorize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const targetEmail = googleEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setShowGoogleInput(true);
      setErrorMessage('لطفاً آدرس ایمیل / جیمیل خود را وارد کنید.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.sendEmailCode(targetEmail);
      setEmailOtp(targetEmail);
      setOtpDisplayName(googleName.trim() || targetEmail.split('@')[0]);
      setOtpCode(''); // Empty! The user MUST enter the code!
      if (res.devCode) {
        setDevReceivedCode(res.devCode);
      }
      setOtpNotice(`کد ۶ رقمی اتورایز برای جیمیل ${targetEmail} صادر شد. لطفاً کد را در کادر زیر وارد فرمایید.`);
      setOtpStep('enter-code');
      setMode('email-otp');
      setShowGoogleInput(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ارسال کد تأیید جیمیل.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle standard password login / register
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!emailOrUsername.trim() || !password) {
          throw new Error('لطفاً ایمیل / نام کاربری و رمز عبور را وارد کنید.');
        }
        const res = await authApi.login({
          emailOrUsername: emailOrUsername.trim(),
          password,
        });
        if (res.user) {
          onSuccess(res.user);
          onClose();
        }
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('لطفاً نام یا نام نمایشی خود را وارد کنید.');
        }
        if (!username.trim() || username.trim().length < 3) {
          throw new Error('نام کاربری باید حداقل ۳ کاراکتر انگلیسی باشد.');
        }
        if (email.trim() && !email.includes('@')) {
          throw new Error('لطفاً در صورت تمایل، یک آدرس ایمیل معتبر وارد کنید.');
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
      setErrorMessage(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              {mode === 'email-otp' ? (
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              ) : mode === 'login' ? (
                <LogIn className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {mode === 'email-otp'
                  ? 'اتورایز و احراز با ایمیل'
                  : mode === 'login'
                  ? 'ورود با شناسه کاربری'
                  : 'ساخت حساب کاربری جدید'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {mode === 'email-otp'
                  ? 'ورود سریع و امن بدون نیاز به حفظ رمز عبور'
                  : 'دسترسی به اسناد ابری، انتشار و همگام‌سازی'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/30 p-1 m-4 mb-2 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('email-otp');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'email-otp'
                ? 'bg-amber-500 text-neutral-950 shadow-md font-extrabold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>اتورایز با ایمیل</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'login'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>ورود</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'register'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ثبت‌نام</span>
          </button>
        </div>

        {/* Google Authorization Section */}
        <div className="px-6 pt-1 pb-2">
          {showGoogleInput ? (
            <form onSubmit={handleGoogleAuthorize} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
                  اتورایز با حساب گوگل (جیمیل)
                </span>
                <button
                  type="button"
                  onClick={() => setShowGoogleInput(false)}
                  className="text-[10px] text-neutral-400 hover:text-[var(--text-primary)] cursor-pointer"
                >
                  انصراف
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  آدرس جیمیل شما (Google Email)
                </label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="nafa.1395@gmail.com"
                    className="w-full ps-9 pe-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  نام و نام خانوادگی شما
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="مثال: ناصری"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                {isLoading ? 'در حال اتورایز...' : 'تأیید و اتورایز با این حساب'}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowGoogleInput(true);
                setErrorMessage(null);
              }}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer hover:border-amber-500/50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>اتورایز سریع با حساب گوگل (Google Account)</span>
            </button>
          )}

          <div className="flex items-center gap-3 my-3">
            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
            <span className="text-[10px] text-neutral-400 font-medium">یا با آدرس ایمیل</span>
            <div className="flex-1 h-px bg-[var(--border-color)]"></div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mb-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* =======================================================
            TAB 1: EMAIL-FIRST OTP AUTHORIZATION
            ======================================================= */}
        {mode === 'email-otp' && (
          <div className="p-6 pt-1 space-y-4">
            {otpStep === 'input-email' ? (
              <form onSubmit={handleSendEmailOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    آدرس ایمیل جهت اتورایز
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    نام و نام خانوادگی / نام انتخابی شما
                  </label>
                  <div className="relative">
                    <User className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={otpDisplayName}
                      onChange={(e) => setOtpDisplayName(e.target.value)}
                      placeholder="مثال: علی احمدی یا مهندس رضایی"
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    این نام روی اسناد منتشره شما و در منوی کاربری سایت نمایش داده می‌شود.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  {isLoading ? (
                    <span>در حال صدور و ارسال کد...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ارسال کد تأیید به ایمیل</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[var(--text-primary)] text-xs flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-500">
                      کد ۶ رقمی تأیید هویت ارسال شد
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      لطفاً صندوق ورودی (Inbox یا Spam) ایمیل{' '}
                      <strong className="text-[var(--text-primary)] font-mono" dir="ltr">
                        {emailOtp}
                      </strong>{' '}
                      را بررسی نموده و کد ۶ رقمی را وارد کنید.
                    </p>
                  </div>
                </div>

                {/* Developer / Demo fallback note */}
                {devReceivedCode && (
                  <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                    <span className="text-[10px]">
                      کد تأیید تولیدشده روی سرور دمو:{' '}
                      <code className="font-mono text-amber-500 font-bold px-1.5 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)]">
                        {devReceivedCode}
                      </code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(devReceivedCode)}
                      className="text-[10px] text-amber-500 hover:underline cursor-pointer font-bold shrink-0 ps-2"
                    >
                      درج خودکار
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                      کد تأیید ۶ رقمی ایمیل
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpStep('input-email')}
                      className="text-[10px] text-amber-500 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      تغییر ایمیل
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      dir="ltr"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm tracking-widest text-center text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    نام انتخابی شما در اسناد و سایت
                  </label>
                  <input
                    type="text"
                    value={otpDisplayName}
                    onChange={(e) => setOtpDisplayName(e.target.value)}
                    placeholder="مثال: علی احمدی یا مهندس رضایی"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    نامی که روی اسناد منتشره شما ثبت می‌شود.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  {isLoading ? (
                    <span>در حال اتورایز هویت...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>تأیید و اتورایز با ایمیل</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =======================================================
            TAB 2 & 3: PASSWORD LOGIN / REGISTER
            ======================================================= */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handlePasswordSubmit} className="p-6 pt-1 space-y-3.5">
            {mode === 'register' && (
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
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    نام کاربری (لاتین)
                  </label>
                  <div className="relative">
                    <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">@</span>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="ali_rezaei"
                      className="w-full ps-9 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                      آدرس ایمیل
                    </label>
                    <span className="text-[10px] text-neutral-400 font-normal">(اختیاری)</span>
                  </div>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="اختیاری: name@example.com"
                      className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' && (
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
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
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
                  className="w-full ps-10 pe-10 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[var(--text-primary)] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 mt-2 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {isLoading ? (
                <span>در حال اتصال...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ورود به حساب</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ثبت‌نام و ورود</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/30 text-center">
          <p className="text-[11px] text-[var(--text-muted)]">
            {mode === 'email-otp' ? (
              <span>اتورایز ابری محافظت‌شده با توکن امن JWT و مخزن Neon PostgreSQL</span>
            ) : mode === 'login' ? (
              <>
                ورود بدون نیاز به رمز عبور؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('email-otp');
                    setErrorMessage(null);
                  }}
                  className="text-amber-500 hover:underline font-bold cursor-pointer"
                >
                  اتورایز مستقیم با ایمیل
                </button>
              </>
            ) : (
              <>
                قبلاً ثبت‌نام کرده‌اید؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-amber-500 hover:underline font-bold cursor-pointer"
                >
                  وارد شوید
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
