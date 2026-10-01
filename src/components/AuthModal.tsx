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
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('لطفاً یک آدرس ایمیل معتبر (مانند user@gmail.com) وارد کنید.');
      return;
    }

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
        const res = await authApi.register({
          email: cleanEmail,
          displayName: displayName.trim() || cleanEmail.split('@')[0],
          password,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
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
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {mode === 'login' ? 'ورود به حساب کاربری' : 'ساخت حساب کاربری با ایمیل'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {mode === 'login'
                  ? 'مشاهده و مدیریت اسناد ابری اختصاصی'
                  : 'عضویت سریع با ایمیل بدون نیاز به کد'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons (Login vs Register) */}
        <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>ورود</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>ثبت‌نام جدید</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name field (only in Register mode) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  نام و نام خانوادگی / نام نمایشی
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="مثال: علی رضایی یا مهندس احمدی"
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
                  />
                  <User className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-3" />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  این نام روی اسناد منتشره شما نمایش داده می‌شود.
                </p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                آدرس ایمیل
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  dir="ltr"
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono transition-colors"
                />
                <Mail className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-3" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                  رمز عبور
                </label>
                {mode === 'register' && (
                  <span className="text-[10px] text-[var(--text-muted)]">حداقل ۶ کاراکتر</span>
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
                  className="w-full ps-9 pe-9 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono transition-colors"
                />
                <Lock className="w-4 h-4 text-[var(--text-muted)] absolute start-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] absolute end-2.5 top-2.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>در حال پردازش...</span>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ورود به حساب کاربری</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>ثبت‌نام و ورود فوری</span>
                </>
              )}
            </button>
          </form>

          {/* Switch mode hint */}
          <div className="mt-5 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border-color)]/60 pt-4">
            {mode === 'login' ? (
              <p>
                حساب کاربری ندارید؟{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className="text-amber-500 hover:underline font-bold cursor-pointer"
                >
                  ثبت‌نام کنید
                </button>
              </p>
            ) : (
              <p>
                قبلاً عضو شده‌اید؟{' '}
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
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/40 text-center text-[10px] text-[var(--text-muted)]">
          ورود و ثبت‌نام ایمن محافظت‌شده با رمزنگاری bcrypt و توکن‌های استاندارد JWT
        </div>
      </div>
    </div>
  );
};
