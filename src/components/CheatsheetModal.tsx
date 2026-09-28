import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, Sparkles, Command } from 'lucide-react';

interface CheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertExample?: (exampleText: string) => void;
}

export const CheatsheetModal: React.FC<CheatsheetModalProps> = ({
  isOpen,
  onClose,
  onInsertExample,
}) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'highlights' | 'advanced' | 'shortcuts'>('highlights');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const highlightExamples = [
    {
      title: 'هایلایت زرد (استاندارد)',
      syntax: '==متن مورد نظر برای هایلایت==',
      preview: 'این یک متن هایلایت شده استاندارد است.',
      colorClass: 'bg-amber-400/20 text-amber-300 border-amber-400',
    },
    {
      title: 'هایلایت سبز (موفقیت / تایید)',
      syntax: '==green:این بخش تایید گردید==',
      preview: 'این بخش تایید گردید.',
      colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400',
    },
    {
      title: 'هایلایت صورتی (نکته ظریف / جذاب)',
      syntax: '==pink:نکته الهام‌بخش یادداشت==',
      preview: 'نکته الهام‌بخش یادداشت.',
      colorClass: 'bg-pink-500/20 text-pink-300 border-pink-400',
    },
    {
      title: 'هایلایت آبی (فنی / پیوندها)',
      syntax: '==blue:لینک یا داده فنی==',
      preview: 'لینک یا داده فنی.',
      colorClass: 'bg-sky-500/20 text-sky-300 border-sky-400',
    },
    {
      title: 'هایلایت بنفش (ایده / خلاقیت)',
      syntax: '==purple:ایده جدید برای طراحی==',
      preview: 'ایده جدید برای طراحی.',
      colorClass: 'bg-purple-500/20 text-purple-300 border-purple-400',
    },
    {
      title: 'هایلایت نارنجی (هشدار / ضرب‌الاجل)',
      syntax: '==orange:مهلت تحویل پروژه: فردا==',
      preview: 'مهلت تحویل پروژه: فردا.',
      colorClass: 'bg-orange-500/20 text-orange-300 border-orange-400',
    },
  ];

  const basicExamples = [
    {
      title: 'عناوین (Headings)',
      syntax: '# عنوان بزرگ ۱\n## عنوان ۲\n### عنوان ۳',
      explanation: 'سرفصل‌های سند با استفاده از ۱ تا ۶ کاراکتر # ساخته می‌شوند.',
    },
    {
      title: 'پررنگ و مورب (Bold & Italic)',
      syntax: '**متن پررنگ**\n*متن کج*\n~~متن خط خورده~~',
      explanation: 'تأکید متنی برای جلب توجه مخاطب.',
    },
    {
      title: 'لیست‌ها و چک‌لیست تعاملی',
      syntax: '- مورد اول لیست\n- مورد دوم لیست\n- [ ] کار انجام نشده\n- [x] کار انجام شده',
      explanation: 'چک‌لیست‌ها در صفحه پیش‌نمایش به صورت تعاملی و قابل کلیک هستند.',
    },
    {
      title: 'پیوند و تصاویر',
      syntax: '[متن پیوند](https://google.com)\n![توضیح تصویر](https://picsum.photos/400/200)',
      explanation: 'درج لینک و تصویر با پشتیبانی از کشیدن و رها کردن.',
    },
  ];

  const advancedExamples = [
    {
      title: 'جعبه‌های اعلان (Admonitions)',
      syntax: '> [!NOTE]\n> متن یادداشت مهم\n\n> [!TIP]\n> ترفند کاربردی برای تسریع کار\n\n> [!WARNING]\n> هشدار مهم درباره ذخیره اطلاعات',
      explanation: 'جعبه‌های رنگی با آیکون مخصوص مطابق استاندارد گیت‌هاب و ابسیدین.',
    },
    {
      title: 'فرمول‌های ریاضیاتی KaTeX',
      syntax: 'فرمول درون‌خطی: $E = mc^2$\n\nبلوک فرمول:\n$$\n\\int_a^b f(x) dx = F(b) - F(a)\n$$',
      explanation: 'رندرینگ دقیق معادلات ریاضی با موتور پرسرعت KaTeX.',
    },
    {
      title: 'جداول ساختاریافته',
      syntax: '| ستون اول | ستون دوم | وضعیت |\n| :--- | :---: | ---: |\n| داده ۱ | مقدار A | ✅ فعال |\n| داده ۲ | مقدار B | ⏳ در حال بررسی |',
      explanation: 'چینش راست‌چین، چپ‌چین و وسط‌چین با دو نقطه : در خط دوم جدول.',
    },
    {
      title: 'بلوک‌های کد با هایلایت نحو',
      syntax: '```python\ndef greet(name):\n    return f"سلام {name}"\n```',
      explanation: 'پشتیبانی از پایتون، جاوااسکریپت، تایپ‌اسکریپت، سی‌اس‌اس، اس‌کیو‌ال، بش، جیسون و...',
    },
  ];

  const shortcutList = [
    { keys: 'Ctrl + H', desc: 'هایلایت کردن متن انتخاب شده' },
    { keys: 'Ctrl + B', desc: 'پررنگ کردن (Bold)' },
    { keys: 'Ctrl + I', desc: 'مورب کردن (Italic)' },
    { keys: 'Ctrl + K', desc: 'درج پیوند (Link)' },
    { keys: 'Ctrl + F', desc: 'جستجو و جایگزینی در متن' },
    { keys: 'Ctrl + S', desc: 'دانلود یا ذخیره فایل .md' },
    { keys: 'Tab', desc: 'ایجاد تورفتگی (Indent)' },
    { keys: 'Shift + Tab', desc: 'کاهش تورفتگی (Outdent)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">راهنمای نشانه‌گذاری و سینتکس مارک‌دان</h2>
              <p className="text-xs text-[var(--text-muted)]">نحوه استفاده از هایلایت، جداول، فرمول‌ها، اعلان‌ها و کلیدهای میانبر</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'highlights'
                ? 'border-amber-500 text-amber-500 font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>انواع هایلایت متن</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'basics'
                ? 'border-amber-500 text-amber-500 font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>عناصر پایه (سرفصل، لیست، فونت)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-amber-500 text-amber-500 font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>پیشرفته (فرمول، اعلان، جداول، کد)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'shortcuts'
                ? 'border-amber-500 text-amber-500 font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Command className="w-3.5 h-3.5" />
            <span>کلیدهای میانبر</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[var(--text-secondary)] text-xs leading-relaxed">
                <span className="font-semibold text-amber-600 dark:text-amber-400">چگونه در مارک‌دان هایلایت کنیم؟</span>
                <p className="mt-1">
                  کافیست دو علامت مساوی در دو طرف متن قرار دهید: <code className="font-mono bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-300">==متن شما==</code>. همچنین می‌توانید پیش از متن نام رنگ را مشخص کنید: <code className="font-mono bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-300">==green:متن سبز==</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {highlightExamples.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-semibold text-[var(--text-primary)] mb-1">{item.title}</div>
                      <div className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1.5 rounded-lg border border-[var(--border-color)] mb-2 overflow-x-auto">
                        {item.syntax}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mb-1">نتیجه بصری:</div>
                      <div className={`p-2 rounded-lg border-s-2 text-xs ${item.colorClass}`}>
                        {item.preview}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-color)]">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.syntax, idx)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] transition-colors text-[11px]"
                      >
                        {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === idx ? 'کپی شد' : 'کپی سینتکس'}</span>
                      </button>
                      {onInsertExample && (
                        <button
                          type="button"
                          onClick={() => {
                            onInsertExample(item.syntax);
                            onClose();
                          }}
                          className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 transition-colors text-[11px] font-medium"
                        >
                          درج در سند
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'basics' && (
            <div className="space-y-4">
              {basicExamples.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.syntax, 100 + idx)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] text-[11px]"
                    >
                      {copiedIndex === 100 + idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>کپی</span>
                    </button>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs">{item.explanation}</p>
                  <pre className="font-mono text-xs text-[var(--text-primary)] bg-[var(--bg-secondary)] p-2.5 rounded-lg border border-[var(--border-color)] overflow-x-auto">
                    {item.syntax}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {advancedExamples.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.syntax, 200 + idx)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] text-[11px]"
                    >
                      {copiedIndex === 200 + idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>کپی</span>
                    </button>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs">{item.explanation}</p>
                  <pre className="font-mono text-xs text-sky-700 dark:text-sky-300 bg-[var(--bg-secondary)] p-2.5 rounded-lg border border-[var(--border-color)] overflow-x-auto whitespace-pre-wrap">
                    {item.syntax}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="p-2 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {shortcutList.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                    <span className="text-[var(--text-primary)]">{item.desc}</span>
                    <kbd className="font-mono text-[11px] px-2.5 py-1 rounded bg-[var(--bg-secondary)] text-amber-600 dark:text-amber-400 border border-[var(--border-color)] font-semibold shadow-xs">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] font-medium text-xs transition-colors"
          >
            بستن راهنما
          </button>
        </div>
      </div>
    </div>
  );
};
