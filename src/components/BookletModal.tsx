import React, { useState } from 'react';
import { BookletConfig } from '../types';
import {
  BookOpen,
  Printer,
  X,
  FileCheck,
  ShieldAlert,
  Sparkles,
  Layers,
  Calendar,
  User,
  Building,
} from 'lucide-react';

interface BookletModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  onPrintBooklet: (config: BookletConfig) => void;
}

export const BookletModal: React.FC<BookletModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  onPrintBooklet,
}) => {
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [authorName, setAuthorName] = useState<string>('مدرس دوره');
  const [subtitle, setSubtitle] = useState<string>('جزوه و کتابچه تمرین رسمی دوره');
  const [institution, setInstitution] = useState<string>('آکادمی آموزش تخصصی');
  const [watermark, setWatermark] = useState<string>('');
  const [showPageNumbers, setShowPageNumbers] = useState<boolean>(true);
  const [showDate, setShowDate] = useState<boolean>(true);

  if (!isOpen) return null;

  const handlePrint = () => {
    onPrintBooklet({
      includeCover,
      authorName,
      subtitle,
      institution,
      watermark,
      showPageNumbers,
      showDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-6 space-y-5 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">
                  چاپ و خروجی کتابچه رسمی (PDF Pro)
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-neutral-950">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                تولید PDF استاندارد با صفحه جلد، واترمارک و سربرگ اختصاصی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Form */}
        <div className="space-y-4 text-xs">
          {/* Cover Page Toggle */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
            <label className="flex items-center justify-between cursor-pointer font-medium">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>افزودن صفحه جلد رسمی به ابتدای کتابچه (Cover Page)</span>
              </div>
              <input
                type="checkbox"
                checked={includeCover}
                onChange={(e) => setIncludeCover(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            {includeCover && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--border-color)]">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">نام مدرس / مؤلف:</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="مثال: دکتر علیرضا رضایی"
                    className="w-full p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">نام آموزشگاه / سازمان:</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="مثال: آکادمی مدیریت هوش مصنوعی"
                    className="w-full p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">زیرعنوان یا شرح درس:</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="مثال: راهنمای عملی دوره‌های هوش مصنوعی و مدیریت پروژه"
                    className="w-full p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Watermark & Formatting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                واترمارک پس‌زمینه (اختیاری):
              </label>
              <input
                type="text"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder="مثال: نسخه اختصاصی هنرجویان"
                className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500 text-xs"
              />
            </div>
            <div className="flex flex-col justify-center space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
                <span>شماره‌گذاری خودکار صفحات</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDate}
                  onChange={(e) => setShowDate(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                />
                <span>درج تاریخ انتشار در پانویس</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
          <span className="text-[11px] text-[var(--text-muted)]">
            برای ذخیره به عنوان فایل PDF، در پنجره باز شده گزینه "Save as PDF" را انتخاب نمایید.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)] transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>پیش‌نمایش چاپ و ایجاد PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
