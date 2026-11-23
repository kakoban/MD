import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  X,
  Check,
  Copy,
  Globe,
  Lock,
  Link2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  User,
} from 'lucide-react';
import { cloudApi } from '../services/cloudApi';
import { DocVisibility } from '../types';
import { buildShareUrl, copyTextToClipboard } from '../utils/shareLink';

interface SharePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  isExistingCloudDoc?: boolean;
  documentTitle: string;
  documentContent: string;
  initialDescription?: string;
  initialTags?: string[];
  initialVisibility?: DocVisibility;
  defaultAuthor?: string;
  onPublishedSuccess?: (
    shareId: string,
    meta: { visibility: DocVisibility; title: string; description: string; tags: string[] }
  ) => void;
  onOpenCommunity?: () => void;
}

const POPULAR_SUGGESTED_TAGS = [
  'آموزشی',
  'برنامه‌نویسی',
  'هوش مصنوعی',
  'خلاصه کتاب',
  'مدیریت پروژه',
  'طراحی سیستم',
  'یادداشت',
  'چک‌لیست',
];

export const SharePublishModal: React.FC<SharePublishModalProps> = ({
  isOpen,
  onClose,
  documentId,
  isExistingCloudDoc = false,
  documentTitle,
  documentContent,
  initialDescription = '',
  initialTags = [],
  initialVisibility = 'private',
  defaultAuthor,
  onPublishedSuccess,
  onOpenCommunity,
}) => {
  const [title, setTitle] = useState(documentTitle || 'سند جدید');
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<DocVisibility>(initialVisibility);
  const [customId, setCustomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [savedVisibility, setSavedVisibility] = useState<DocVisibility>('private');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedExistingLink, setCopiedExistingLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wasOpenRef = useRef(false);
  const lastDocIdRef = useRef<string | undefined>(documentId);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    const switchedDocWhileOpen = isOpen && documentId !== lastDocIdRef.current && !publishedUrl;

    if (justOpened || switchedDocWhileOpen) {
      setTitle(documentTitle || 'سند جدید');
      setDescription(initialDescription || '');
      setTags(initialTags && initialTags.length > 0 ? [...initialTags] : []);
      setVisibility(initialVisibility || 'private');
      setCustomId('');
      setPublishedUrl(null);
      setCopiedLink(false);
      setCopiedExistingLink(false);
      setErrorMsg(null);
    }

    wasOpenRef.current = isOpen;
    lastDocIdRef.current = documentId;
  }, [isOpen, documentId, documentTitle, initialDescription, initialTags, initialVisibility, publishedUrl]);

  if (!isOpen) return null;

  const existingShareUrl =
    isExistingCloudDoc && documentId && (initialVisibility === 'unlisted' || initialVisibility === 'public')
      ? buildShareUrl(documentId)
      : null;

  const authorDisplay = defaultAuthor?.trim() || 'شما';

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

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let resolvedId = documentId || '';

      if (isExistingCloudDoc && documentId) {
        await cloudApi.updateFile(documentId, {
          title: title.trim(),
          content: documentContent,
          description: description.trim(),
          tags,
          visibility,
          is_public: visibility === 'public',
        });
        resolvedId = documentId;
      } else {
        const res = await cloudApi.publishFile({
          title: title.trim(),
          content: documentContent,
          description: description.trim(),
          author_name: authorDisplay,
          tags,
          visibility,
          is_public: visibility === 'public',
          customId: customId.trim() || undefined,
        });
        resolvedId = res.file.id;
      }

      const fullShareUrl = buildShareUrl(resolvedId);
      setSavedVisibility(visibility);
      setPublishedUrl(fullShareUrl);
      onPublishedSuccess?.(resolvedId, {
        visibility,
        title: title.trim(),
        description: description.trim(),
        tags,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره‌سازی تنظیمات اشتراک');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publishedUrl) return;
    const ok = await copyTextToClipboard(publishedUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyExistingLink = async () => {
    if (!existingShareUrl) return;
    const ok = await copyTextToClipboard(existingShareUrl);
    if (ok) {
      setCopiedExistingLink(true);
      setTimeout(() => setCopiedExistingLink(false), 2500);
    }
  };

  const handleResetAndClose = () => {
    setPublishedUrl(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={handleResetAndClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-6 space-y-5 text-[var(--text-primary)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                تنظیمات دسترسی و اشتراک‌گذاری
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                تعیین کنید چه کسانی به این سند دسترسی داشته باشند
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
                  تنظیمات دسترسی سند ذخیره شد
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {savedVisibility === 'private'
                    ? 'این سند در وضعیت خصوصی قرار دارد و هیچ کاربر دیگری امکان مشاهده آن را ندارد.'
                    : savedVisibility === 'unlisted'
                    ? 'این سند در اکسپلور عمومی نمایش داده نمی‌شود؛ تنها کسانی که لینک زیر را داشته باشند می‌توانند آن را مطالعه کنند.'
                    : 'این سند در اکسپلور عمومی منتشر شد و با لینک زیر نیز قابل دسترسی است.'}
                </p>
              </div>
            </div>

            {savedVisibility !== 'private' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--text-muted)]">
                  لینک مستقیم اشتراک:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={publishedUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="bg-transparent text-xs text-[var(--text-primary)] font-mono flex-1 outline-none px-1 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'کپی شد' : 'کپی لینک'}</span>
                  </button>
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-amber-500 transition-colors shrink-0"
                    title="باز کردن لینک در تب جدید"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
              {onOpenCommunity && savedVisibility === 'public' && (
                <button
                  type="button"
                  onClick={() => {
                    handleResetAndClose();
                    onOpenCommunity();
                  }}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>مشاهده در اکسپلور عمومی</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] transition-colors ms-auto cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handlePublish} className="space-y-4 text-xs">
            {existingShareUrl && (
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>لینک مستقیم فعلی این سند:</span>
                  </span>
                  <a
                    href={existingShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <span>باز کردن</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={existingShareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="bg-transparent text-[11px] text-[var(--text-primary)] font-mono flex-1 outline-none px-1.5 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyExistingLink}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedExistingLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedExistingLink ? 'کپی شد' : 'کپی لینک'}</span>
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                عنوان سند:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان سند..."
                className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-medium"
                required
              />
            </div>

            {/* Author Info + Optional Custom Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  نام نویسنده (از پروفایل شما):
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                  <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-semibold truncate">{authorDisplay}</span>
                </div>
              </div>

              {!isExistingCloudDoc && (
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    شناسه دلخواه لینک (اختیاری):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="deep-learning-notes"
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                  />
                </div>
              )}
            </div>

            {/* Three-Tier Visibility Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                سطح دسترسی سند:
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`w-full text-start p-3 rounded-2xl border flex items-start gap-3 transition-colors cursor-pointer ${
                    visibility === 'private'
                      ? 'bg-amber-500/10 border-amber-500/50 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-amber-500/30'
                  }`}
                >
                  <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${visibility === 'private' ? 'text-amber-500' : 'text-[var(--text-muted)]'}`} />
                  <div className="flex-1">
                    <div className="font-bold text-xs">خصوصی (فقط خودم)</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      هیچ کاربر دیگری حتی با داشتن لینک امکان مشاهده این سند را ندارد.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('unlisted')}
                  className={`w-full text-start p-3 rounded-2xl border flex items-start gap-3 transition-colors cursor-pointer ${
                    visibility === 'unlisted'
                      ? 'bg-sky-500/10 border-sky-500/50 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-sky-500/30'
                  }`}
                >
                  <Link2 className={`w-4 h-4 mt-0.5 shrink-0 ${visibility === 'unlisted' ? 'text-sky-500' : 'text-[var(--text-muted)]'}`} />
                  <div className="flex-1">
                    <div className="font-bold text-xs">اشتراک با لینک مستقیم</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      در اکسپلور عمومی نمایش داده نمی‌شود، اما هر کس لینک را داشته باشد می‌تواند آن را مطالعه کند.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`w-full text-start p-3 rounded-2xl border flex items-start gap-3 transition-colors cursor-pointer ${
                    visibility === 'public'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-emerald-500/30'
                  }`}
                >
                  <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${visibility === 'public' ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
                  <div className="flex-1">
                    <div className="font-bold text-xs">انتشار در اکسپلور عمومی</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      برای همه کاربران در بخش اکسپلور عمومی قابل مشاهده، جستجو و مطالعه است.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                توضیح کوتاه (اختیاری):
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="خلاصه‌ای کوتاه درباره محتوای این سند..."
                rows={2}
                className="w-full p-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                برچسب‌ها:
              </label>
              {tags.length > 0 && (
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
                        className="hover:text-rose-400 ms-0.5 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  className="px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] cursor-pointer"
                >
                  افزودن
                </button>
              </div>

              <div className="flex flex-wrap gap-1 pt-1.5 items-center">
                <span className="text-[10px] text-[var(--text-muted)]">پیشنهاد:</span>
                {POPULAR_SUGGESTED_TAGS.filter((t) => !tags.includes(t))
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:bg-amber-500/20 hover:text-amber-500 text-[var(--text-muted)] transition-colors cursor-pointer"
                    >
                      +{t}
                    </button>
                  ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ذخیره تنظیمات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
