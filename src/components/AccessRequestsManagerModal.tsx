import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  Check,
  XCircle,
  Clock,
  CheckCircle2,
  FileText,
  User,
  RefreshCw,
  Loader2,
  Inbox,
  Mail,
} from 'lucide-react';
import { DocumentAccessRequest, cloudApi } from '../services/cloudApi';

interface AccessRequestsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestsUpdated?: () => void;
}

export const AccessRequestsManagerModal: React.FC<AccessRequestsManagerModalProps> = ({
  isOpen,
  onClose,
  onRequestsUpdated,
}) => {
  const [requests, setRequests] = useState<DocumentAccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await cloudApi.getIncomingAccessRequests();
      setRequests(res.requests || []);
    } catch (err: any) {
      console.error('Error fetching incoming access requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, fetchRequests]);

  if (!isOpen) return null;

  const handleRespond = async (requestId: string, status: 'approved' | 'rejected') => {
    setActionLoadingId(requestId);
    setFeedback(null);
    try {
      const res = await cloudApi.respondToAccessRequest(requestId, status);
      setFeedback(res.message);
      // Update local state
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status } : r))
      );
      onRequestsUpdated?.();
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت پاسخ');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)] max-h-[85vh]"
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
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  مدیریت درخواست‌های دسترسی به اسناد
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-[10px]">
                    {pendingCount} در انتظار
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                تأیید یا لغو دسترسی سایر کاربران به اسناد خصوصی شما
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchRequests}
              className="p-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="بروزرسانی لیست"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 text-xs">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            در انتظار بررسی ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'approved'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            تأیید شده ({requests.filter((r) => r.status === 'approved').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'rejected'
                ? 'bg-rose-500 text-white font-bold shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            رد شده ({requests.filter((r) => r.status === 'rejected').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            همه ({requests.length})
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs hover:underline"
            >
              بستن
            </button>
          </div>
        )}

        {/* List of Requests */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && requests.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>در حال بارگذاری درخواست‌ها...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-[var(--text-muted)] text-xs">
              <Inbox className="w-10 h-10 mx-auto opacity-40 text-neutral-400" />
              <p>درخواستی در این بخش وجود ندارد.</p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isActionLoading = actionLoadingId === req.id;
              const dateStr = new Date(req.created_at).toLocaleDateString('fa-IR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-amber-500/30 transition-all space-y-3"
                >
                  {/* Top: Document & Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-[var(--text-primary)] truncate">
                          سند: {req.file_title || req.file_id}
                        </h4>
                        {req.file_description && (
                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                            {req.file_description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-[var(--text-muted)]">{dateStr}</span>
                      {req.status === 'pending' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25 text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          در انتظار
                        </span>
                      ) : req.status === 'approved' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          تأیید شده
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 text-[10px] font-bold flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          رد شده
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Requester Info */}
                  <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)]/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs">
                        {req.requester_name ? req.requester_name.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-[var(--text-primary)]">
                          {req.requester_name || 'کاربر متقاضی'}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono" dir="ltr">
                          @{req.requester_username || 'user'}
                          {req.requester_email && !req.requester_email.endsWith('@local.user') && (
                            <span className="ms-2 text-neutral-400">({req.requester_email})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {req.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleRespond(req.id, 'approved')}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>تأیید دسترسی</span>
                        </button>
                      )}

                      {req.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleRespond(req.id, 'rejected')}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رد</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Requester Message if any */}
                  {req.message && (
                    <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-[var(--text-secondary)]">
                      <span className="font-bold text-[10px] text-amber-600 dark:text-amber-400 block mb-0.5">
                        پیام متقاضی:
                      </span>
                      <p className="text-[11px] leading-relaxed">{req.message}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
