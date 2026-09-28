import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Presentation,
  BookOpen,
  Code,
  CheckSquare,
  Bookmark,
  FileText,
  Search,
  Check,
  ArrowRight,
} from 'lucide-react';
import { MARKDOWN_TEMPLATES, MarkdownTemplate } from '../data/templates';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: MarkdownTemplate) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MarkdownTemplate>(
    MARKDOWN_TEMPLATES[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(MARKDOWN_TEMPLATES.map((t) => t.category)))];

  const filteredTemplates = MARKDOWN_TEMPLATES.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Presentation':
        return <Presentation className="w-5 h-5 text-amber-500" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'Code':
        return <Code className="w-5 h-5 text-emerald-500" />;
      case 'CheckSquare':
        return <CheckSquare className="w-5 h-5 text-rose-500" />;
      case 'Bookmark':
        return <Bookmark className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-4xl h-[82vh] rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[var(--text-primary)]">
                الگوهای آماده اسناد (Templates)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                یک قالب آماده انتخاب کنید تا بدون اتلاف وقت، نگارش یا تدریس خود را شروع کنید
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl transition-colors font-medium whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                {cat === 'all' ? 'همه الگوها' : cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی الگو..."
              className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Body: Split View (List of templates + Preview pane) */}
        <div className="flex-1 flex overflow-hidden">
          {/* List */}
          <div className="w-1/2 border-e border-[var(--border-color)] overflow-y-auto p-4 space-y-2.5">
            {filteredTemplates.map((template) => {
              const isSelected = selectedTemplate.id === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shrink-0">
                        {getTemplateIcon(template.iconName)}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[var(--text-primary)]">
                          {template.title}
                        </h4>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.tags.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Preview Pane */}
          <div className="w-1/2 flex flex-col bg-[var(--bg-primary)]/50 overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between shrink-0 bg-[var(--bg-primary)]">
              <div>
                <h3 className="font-bold text-xs text-[var(--text-primary)]">
                  پیش‌نمایش محتوا: {selectedTemplate.title}
                </h3>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {selectedTemplate.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(selectedTemplate);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs shadow-md transition-colors"
              >
                <span>ایجاد سند با این الگو</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <pre className="font-mono text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed select-text bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
                {selectedTemplate.content}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
          <span>{filteredTemplates.length} الگوی تخصصی در دسترس است</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
