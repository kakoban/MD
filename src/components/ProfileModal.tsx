import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Calendar,
  FileText,
  Save,
  Check,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '../types';
import { authApi } from '../services/authApi';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  React.useEffect(() => {
    setDisplayName(user.displayName);
    setUsername(user.username);
    setBio(user.bio || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setErrorNotice('لطفاً یک نام نمایشی وارد کنید.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setErrorNotice('نام کاربری لاتین باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    setIsLoading(true);
    setSuccessNotice(null);
    setErrorNotice(null);

    try {
      const updated = await authApi.updateProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      onUserUpdated(updated);
      setSuccessNotice('نام و مشخصات حساب شما با موفقیت ذخیره شد.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err.message || 'خطا در ذخیره تغییرات.');
    } finally {
      setIsLoading(false);
    }
  };

  const initials = user.displayName
    ? user.displayName.slice(0, 2).toUpperCase()
    : user.username.slice(0, 2).toUpperCase();

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
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold">پروفایل و مشخصات کاربری</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-[var(--border-color)] flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-500 flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base truncate">{user.displayName}</h3>
            <p className="text-xs text-neutral-400 font-mono" dir="ltr">
              @{user.username}
            </p>
            {user.email && !user.email.endsWith('@local.user') && (
              <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5" dir="ltr">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Notifications */}
        {successNotice && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}
        {errorNotice && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              نام انتخابی / نام و نام خانوادگی
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثال: علی احمدی یا مهندس رضایی"
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
            />
            <p className="text-[10px] text-neutral-400 mt-1">این نام روی تمامی اسناد و مقالات اشتراکی شما نمایش داده خواهد شد.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              نام کاربری / شناسه لاتین (Username)
            </label>
            <div className="relative">
              <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-mono">@</span>
              <input
                type="text"
                required
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^\w-]/g, ''))}
                placeholder="nafa1395"
                className="w-full ps-8 pe-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              درباره من / بیوگرافی کوتاه
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="مثلاً: پژوهشگر مهندسی و علاقه‌مند به هوش مصنوعی..."
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج از حساب</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isLoading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
