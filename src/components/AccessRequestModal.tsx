import React, { useState } from 'react';
import {
  X,
  Lock,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  LogIn,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';
import { SharedMarkdownFile, cloudApi } from '../services/cloudApi';
import { UserProfile } from '../types';

interface AccessRequestModalProps {
  isOpen: boolean;
  file: SharedMarkdownFile | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onRequestSent?: () => void;
}

export const AccessRequestModal: React.FC<AccessRequestModalProps> = ({
  isOpen,
  file,
  currentUser,
  onClose,
  onOpenAuth,
  onRequestSent,
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'none' | 'pending' | 'rejected' | 'approved'>(
    file?.my_access_status || 'none'
  );

  if (!isOpen || !file) return null;

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await cloudApi.requestFileAccess(file.id, message.trim());
      setSuccessNotice(res.message || 'درخواست دسترسی با موفقیت ارسال گردید.');
      setCurrentStatus('pending');
      onRequestSent?.();
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال درخواست دسترسی.');
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                سند خصوصی و نیازمند مجوز
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                دسترسی برای مشاهده عمومی این فایل مسدود است
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          {/* Document Summary Card */}
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-xs text-[var(--text-primary)] truncate">
                  {file.title}
                </h3>
                {file.description && (
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                    {file.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]/60 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-neutral-400" />
                نویسنده: <strong className="text-[var(--text-secondary)]">{file.author_name}</strong>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25 font-semibold text-[9px] flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                غیر عمومی
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Status states */}
          {currentStatus === 'pending' ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center space-y-2">
              <Clock className="w-8 h-8 text-amber-500 mx-auto animate-pulse" />
              <h4 className="font-bold text-xs text-amber-600 dark:text-amber-300">
                درخواست شما در انتظار تأیید نویسنده است
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                درخواست دسترسی شما برای <strong>{file.author_name}</strong> ارسال شده است. به محض تأیید ایشان، امکان مطالعه و باز کردن محتوای سند برای شما فعال خواهد شد.
              </p>
            </div>
          ) : currentStatus === 'rejected' ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
              <h4 className="font-bold text-xs text-rose-500">
                درخواست قبلی توسط نویسنده رد شده است
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                می‌توانید پیام جدیدی بنویسید و مجدداً درخواست دسترسی ارسال فرمایید.
              </p>
            </div>
          ) : null}

          {/* Action Form */}
          {!currentUser ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-[var(--text-secondary)] text-center">
                برای ارسال درخواست دسترسی به این سند، ابتدا وارد حساب کاربری خود شوید:
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود به حساب کاربری</span>
              </button>
            </div>
          ) : currentStatus !== 'pending' ? (
            <form onSubmit={handleSendRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  پیام اختیاری برای نویسنده سند
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="مثال: سلام، جهت مطالعه بخش‌های مربوط به پروژه به این سند نیاز دارم..."
                  rows={3}
                  maxLength={500}
                  className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-colors shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isLoading ? 'در حال ارسال درخواست...' : 'ارسال درخواست دسترسی به نویسنده'}</span>
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] font-semibold text-xs transition-colors"
            >
              بستن پنجره
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
