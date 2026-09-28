import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Clock,
  Eye,
  Star,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  FolderOpen,
  User,
} from 'lucide-react';
import { authApi } from '../services/authApi';
import { cloudApi } from '../services/cloudApi';
import { SharedMarkdownFile } from '../services/cloudApi';

interface MyDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument: (file: SharedMarkdownFile) => void;
  userName?: string;
}

export const MyDocumentsModal: React.FC<MyDocumentsModalProps> = ({
  isOpen,
  onClose,
  onOpenDocument,
  userName,
}) => {
  const [documents, setDocuments] = useState<SharedMarkdownFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMyDocs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const files = await authApi.getMyDocuments();
      setDocuments(files);
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در بارگذاری اسناد شما.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyDocs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (fileId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`آیا از حذف سند ابری «${title}» اطمینان دارید؟`)) return;
    try {
      await cloudApi.deleteFile(fileId);
      setDocuments((prev) => prev.filter((d) => d.id !== fileId));
    } catch (err: any) {
      alert(err.message || 'خطا در حذف سند');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">اسناد ابری من</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                تمام اسناد ذخیره‌شده و همگام در پایگاه داده ابری Neon {userName ? `(${userName})` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchMyDocs}
              disabled={isLoading}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              title="بروزرسانی لیست"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && documents.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-muted)]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-amber-500" />
              <span>در حال بازیابی اسناد از پایگاه ابری...</span>
            </div>
          ) : errorMessage ? (
            <div className="py-12 text-center text-xs text-rose-400">
              <p>{errorMessage}</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)]">
              <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-400 opacity-60" />
              <p className="text-xs font-semibold text-[var(--text-secondary)]">هنوز سندی در حساب ابری خود ذخیره نکرده‌اید.</p>
              <p className="text-[11px] mt-1 text-[var(--text-muted)]">
                با کلیک روی دکمه «اشتراک ابری» در بالای صفحه، سند فعال در حساب شما ذخیره می‌شود.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  onOpenDocument(doc);
                  onClose();
                }}
                className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-amber-500/50 hover:bg-[var(--bg-tertiary)]/40 transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-amber-500 transition-colors truncate">
                      {doc.title}
                    </h3>
                    <span className="text-[10px] px-2 py-0.2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)]">
                      {doc.is_public ? 'عمومی' : 'خصوصی'}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-[11px] text-[var(--text-muted)] truncate mb-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1 font-semibold text-amber-500">
                      <User className="w-3 h-3 text-amber-500" />
                      <span>{doc.author_name || userName || 'شما'}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{new Date(doc.updated_at).toLocaleDateString('fa-IR')}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-neutral-400" />
                      <span>{doc.views_count} بازدید</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span>{doc.stars_count} ستاره</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(doc.id, doc.title, e)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="حذف سند"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-xl text-neutral-400 hover:text-amber-500 group-hover:text-amber-500 transition-colors"
                    title="باز کردن در ویرایشگر"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
