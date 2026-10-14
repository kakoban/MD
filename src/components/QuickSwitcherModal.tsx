import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, FileText, Folder, Clock, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { MarkdownDoc } from '../types';
import { getEffectiveFolderPath, getFolderTheme, getDocUploadTime, deduplicateDocs } from '../utils/docTree';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: MarkdownDoc[];
  onSelectDoc: (id: string, mode?: 'split' | 'editor' | 'preview') => void;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  documents,
  onSelectDoc,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const cleanDocs = useMemo(() => deduplicateDocs(documents), [documents]);

  const filteredDocs = useMemo(() => {
    if (!query.trim()) {
      return cleanDocs.slice(0, 15);
    }
    const q = query.toLowerCase().trim();
    return cleanDocs.filter((d) => {
      const matchTitle = (d.title || '').toLowerCase().includes(q);
      const matchFolder = (d.folderPath || '').toLowerCase().includes(q);
      const matchContent = (d.content || '').toLowerCase().includes(q);
      return matchTitle || matchFolder || matchContent;
    }).slice(0, 20);
  }, [cleanDocs, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside switcher
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filteredDocs.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredDocs.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredDocs[selectedIndex]) {
          onSelectDoc(filteredDocs[selectedIndex].id, 'split');
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredDocs, selectedIndex, onSelectDoc, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50">
          <Search className="w-5 h-5 text-[#0061FF] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی سریع سند یا پوشه (نام، متن، سرفصل)..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[10px] text-[var(--text-muted)] font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-96 overflow-y-auto divide-y divide-[var(--border-color)]/40 p-1"
        >
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              سندی با این مشخصات یافت نشد.
            </div>
          ) : (
            filteredDocs.map((doc, idx) => {
              const isSelected = idx === selectedIndex;
              const folderName = getEffectiveFolderPath(doc.folderPath);
              const theme = getFolderTheme(folderName);
              const uploadTime = getDocUploadTime(doc);
              const timeStr = new Date(uploadTime).toLocaleDateString('fa-IR', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.id, 'split');
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#0061FF]/15 text-white'
                      : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-[#0061FF]' : theme.icon
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs truncate">
                          {doc.title || 'سند بدون عنوان'}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.2 rounded-full font-bold border ${theme.badge} inline-flex items-center gap-1 shrink-0`}
                        >
                          <Folder className="w-2.5 h-2.5" />
                          <span>{folderName}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                        {doc.content.replace(/[#*`~\[\]]/g, '').slice(0, 80) || 'سند بدون متن...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ms-2">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{timeStr}</span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#0061FF] animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/30 text-[10px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span>↑↓ جهت جابه‌جایی</span>
            <span>↵ ورود به سند</span>
          </div>
          <span>کلید میانبر همگانی: Ctrl + K</span>
        </div>
      </div>
    </div>
  );
};
