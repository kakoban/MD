import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  User,
  X,
  LogIn,
  Loader2,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { DocumentComment, cloudApi } from '../services/cloudApi';
import { UserProfile } from '../types';

interface DocumentCommentsProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  documentTitle?: string;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onCommentsCountChange?: (count: number) => void;
}

export const DocumentComments: React.FC<DocumentCommentsProps> = ({
  isOpen,
  onClose,
  fileId,
  documentTitle,
  currentUser,
  onOpenAuth,
  onCommentsCountChange,
}) => {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!fileId) return;
    setIsLoading(true);
    try {
      const data = await cloudApi.getComments(fileId);
      setComments(data);
      onCommentsCountChange?.(data.length);
    } catch (e: any) {
      console.error('Error fetching comments:', e);
    } finally {
      setIsLoading(false);
    }
  }, [fileId, onCommentsCountChange]);

  useEffect(() => {
    if (isOpen && fileId) {
      fetchComments();
    }
  }, [isOpen, fileId, fetchComments]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!content.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await cloudApi.addComment(fileId, content.trim());
      if (res.comment) {
        setComments((prev) => [...prev, res.comment]);
        setContent('');
        onCommentsCountChange?.(comments.length + 1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت نظر');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return;
    try {
      await cloudApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentsCountChange?.(Math.max(0, comments.length - 1));
    } catch (err: any) {
      alert(err.message || 'خطا در حذف نظر');
    }
  };

  const formatPersianDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[var(--bg-secondary)] border-s border-[var(--border-color)] shadow-2xl flex flex-col text-[var(--text-primary)] animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0061FF]/10 text-[#0061FF] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  نظرات و بازخوردها
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#0061FF]/15 text-[#0061FF] font-bold text-xs">
                  {comments.length}
                </span>
              </div>
              {documentTitle && (
                <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[240px] mt-0.5">
                  {documentTitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchComments}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="بروزرسانی نظرات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading && comments.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0061FF]" />
              <span>در حال بارگذاری نظرات...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-20 text-center text-xs text-[var(--text-muted)] space-y-2">
              <MessageCircle className="w-10 h-10 mx-auto opacity-30 text-[#0061FF]" />
              <p className="font-medium text-sm text-[var(--text-primary)]">هنوز نظری ثبت نشده است</p>
              <p className="text-[11px]">اولین نفری باشید که برای این سند نظر می‌نویسد.</p>
            </div>
          ) : (
            comments.map((cmt) => {
              const isAuthor = currentUser && (currentUser.id === cmt.user_id || currentUser.username === cmt.author_username);
              const initials = cmt.author_name
                ? cmt.author_name.slice(0, 2).toUpperCase()
                : (cmt.author_username ? cmt.author_username.slice(0, 2).toUpperCase() : 'U');

              return (
                <div
                  key={cmt.id}
                  className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-2 group transition-all hover:border-[#0061FF]/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-[#0061FF]/15 text-[#0061FF] font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{cmt.author_name || 'کاربر'}</span>
                          {cmt.author_username && (
                            <span className="text-[10px] text-sky-500 font-mono" dir="ltr">
                              @{cmt.author_username}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatPersianDate(cmt.created_at)}
                        </span>
                      </div>
                    </div>

                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => handleDelete(cmt.id)}
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="حذف نظر"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed pe-1">
                    {cmt.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* New Comment Section */}
        <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/30 shrink-0">
          {errorMsg && (
            <div className="mb-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!currentUser ? (
            /* Unauthenticated Prompt */
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[#0061FF]/30 text-center space-y-2.5 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-[#0061FF]/10 text-[#0061FF] flex items-center justify-center mx-auto">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  برای ثبت نظر، ابتدا وارد حساب کاربری خود شوید
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  ارسال بازخورد و مشارکت در بحث نیازمند عضویت است
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-[#0061FF] hover:bg-[#0050e6] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ورود به حساب یا ثبت‌نام</span>
              </button>
            </div>
          ) : (
            /* Authenticated Comment Form */
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`نظر خود را به عنوان @${currentUser.username} بنویسید...`}
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[#0061FF] focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <div className="w-5 h-5 rounded-full bg-[#0061FF]/20 text-[#0061FF] text-[9px] font-bold flex items-center justify-center">
                    {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'U'}
                  </div>
                  <span className="font-mono text-sky-500">@{currentUser.username}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0061FF] hover:bg-[#0050e6] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>ارسال نظر</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
