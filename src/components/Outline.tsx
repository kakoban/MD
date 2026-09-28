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
    <aside className="w-64 border-s border-[var(--border-color)] bg-[var(--bg-secondary)] backdrop-blur-md flex flex-col h-full z-10 shrink-0 select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
          <ListTree className="w-4 h-4 text-amber-500" />
          <span>فهرست سرفصل‌ها (TOC)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
                onClick={() => onSelectHeading(heading.id, heading.line)}
                className={`w-full text-start py-1.5 pe-2 rounded-lg hover:bg-[var(--bg-tertiary)] hover:text-amber-500 transition-colors flex items-center gap-1.5 truncate ${indentClass}`}
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
  );
};
