import React, { useState } from 'react';
import {
  CloudUpload,
  X,
  Share2,
  Check,
  Copy,
  Tag,
  Globe,
  Lock,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Database,
  Loader2,
} from 'lucide-react';
import { cloudApi } from '../services/cloudApi';

interface SharePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  defaultAuthor?: string;
  onPublishedSuccess?: (shareId: string) => void;
  onOpenCommunity?: () => void;
}

const POPULAR_SUGGESTED_TAGS = [
  'آموزشی',
  'برنامه‌نویسی',
  'هوش مصنوعی',
  'خلاصه کتاب',
  'مدیریت پروژه',
  'طراحی سیستم',
  'یادداشت شخصی',
  'چک‌لیست',
];

export const SharePublishModal: React.FC<SharePublishModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  defaultAuthor,
  onPublishedSuccess,
  onOpenCommunity,
}) => {
  const [title, setTitle] = useState(documentTitle || 'سند جدید');
  const [authorName, setAuthorName] = useState(() => {
    return defaultAuthor || localStorage.getItem('markdown_author_name') || 'نویسنده';
  });

  React.useEffect(() => {
    if (defaultAuthor && defaultAuthor.trim()) {
      setAuthorName(defaultAuthor.trim());
    }
  }, [defaultAuthor, isOpen]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(['آموزشی']);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [customId, setCustomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('عنوان سند الزامی است.');
      return;
    }
    if (!documentContent.trim()) {
      setErrorMsg('محتوای سند خالی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      localStorage.setItem('markdown_author_name', authorName);

      const res = await cloudApi.publishFile({
        title: title.trim(),
        content: documentContent,
        description: description.trim(),
        author_name: authorName.trim(),
        tags,
        is_public: isPublic,
        customId: customId.trim() || undefined,
      });

      const fullShareUrl = `${window.location.origin}/?share=${res.file.id}`;
      setPublishedUrl(fullShareUrl);
      if (onPublishedSuccess) {
        onPublishedSuccess(res.file.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ارتباط با دیتابیس Neon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setPublishedUrl(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-6 space-y-5 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  اشتراک‌گذاری در پایگاه داده ابری
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  Neon PostgreSQL
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                ذخیره پایدار در دیتابیس و تولید لینک مستقیم اشتراک‌گذاری
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success View */}
        {publishedUrl ? (
          <div className="space-y-4 py-2 animate-in zoom-in-95 duration-200">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-500">
                  فایل شما با موفقیت در پایگاه داده ذخیره شد!
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  اکنون هر کاربری با این لینک می‌تواند فایل مارک‌دان را مشاهده، مطالعه و در ادیتور خود باز کند.
                </p>
              </div>
            </div>

            {/* Link box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-muted)]">
                لینک اختصاصی اشتراک:
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                <input
                  type="text"
                  readOnly
                  value={publishedUrl}
                  className="bg-transparent text-xs text-[var(--text-primary)] font-mono flex-1 outline-none px-1"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'کپی شد' : 'کپی لینک'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {onOpenCommunity && (
                <button
                  type="button"
                  onClick={() => {
                    handleResetAndClose();
                    onOpenCommunity();
                  }}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>مشاهده در مخزن فایل‌های همگانی</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] transition-colors ms-auto"
              >
                بستن و ادامه
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handlePublish} className="space-y-3.5 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                عنوان فایل:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان فایل مارک‌دان..."
                className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-medium"
                required
              />
            </div>

            {/* Author & Custom Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  نام نویسنده / منتشرکننده:
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="نام شما یا گروه..."
                  className="w-full p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  شناسه دلخواه لینک (اختیاری):
                </label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="مثال: deep-learning-notes"
                  className="w-full p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                توضیح کوتاه درباره محتوا:
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="این سند شامل چه مباحثی است..."
                rows={2}
                className="w-full p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                دسته‌بندی و برچسب‌ها:
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400 ms-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="برچسب جدید و فشردن Enter..."
                  className="flex-1 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                >
                  افزودن
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1 pt-1.5 items-center">
                <span className="text-[10px] text-[var(--text-muted)]">پیشنهاد:</span>
                {POPULAR_SUGGESTED_TAGS.filter((t) => !tags.includes(t))
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:bg-amber-500/20 hover:text-amber-500 text-[var(--text-muted)] transition-colors"
                    >
                      +{t}
                    </button>
                  ))}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="p-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <div className="font-semibold text-xs text-[var(--text-primary)]">
                    {isPublic ? 'نمایش در مخزن همگانی (Public)' : 'فقط با لینک مستقیم (Unlisted)'}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {isPublic
                      ? 'سایر کاربران در کتابخانه عمومی می‌توانند این فایل را پیدا کنند.'
                      : 'فقط کسانی که لینک را دارند می‌توانند فایل را باز کنند.'}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-500" />
                ذخیره روی دیتابیس ابری Neon
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)] transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs shadow-md transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>انتشار و ساخت لینک</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
