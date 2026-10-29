import React from 'react';
import { ListTree, X, Hash } from 'lucide-react';
import { HeadingItem } from '../types';

interface OutlineProps {
  headings: HeadingItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectHeading: (id: string, line?: number) => void;
}

export const Outline: React.FC<OutlineProps> = ({
  headings,
  isOpen,
  onClose,
  onSelectHeading,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 end-0 z-50 w-72 max-w-[85vw] md:relative md:inset-auto md:w-64 border-s border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl md:shadow-none flex flex-col h-full select-none transition-all">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <ListTree className="w-4 h-4 text-amber-500" />
            <span>فهرست سرفصل‌ها (TOC)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
          {headings.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-xs leading-relaxed">
              سرفصلی در متن یافت نشد. با درج <code className="text-amber-500"># عنوان</code> سرفصل جدید بسازید.
            </div>
          ) : (
            headings.map((heading, idx) => {
              const indentClass =
                heading.level === 1
                  ? 'ps-2 font-semibold text-[var(--text-primary)]'
                  : heading.level === 2
                  ? 'ps-5 text-[var(--text-secondary)]'
                  : heading.level === 3
                  ? 'ps-8 text-[var(--text-muted)]'
                  : 'ps-10 text-[var(--text-muted)]';

              return (
                <button
                  key={`${heading.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectHeading(heading.id, heading.line);
                    // On mobile, auto-close outline after selection so user sees content
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={`w-full text-start py-1.5 pe-2 rounded-lg hover:bg-[var(--bg-tertiary)] hover:text-amber-500 transition-colors flex items-center gap-1.5 truncate cursor-pointer ${indentClass}`}
                >
                  <Hash className="w-3 h-3 shrink-0 opacity-50" />
                  <span className="truncate">{heading.text}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)] text-center">
          {headings.length} بخش شناسایی شد
        </div>
      </aside>
    </>
  );
};
