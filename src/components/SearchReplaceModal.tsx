import React, { useState, useEffect } from 'react';
import { Search, Replace, X, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, matchCase: boolean) => number;
  onReplace: (replaceWith: string) => void;
  onReplaceAll: (searchQuery: string, replaceWith: string, matchCase: boolean) => number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  currentMatchIndex: number;
  totalMatches: number;
}

export const SearchReplaceModal: React.FC<SearchReplaceModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
  onNextMatch,
  onPrevMatch,
  currentMatchIndex,
  totalMatches,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery) {
      onSearch(searchQuery, matchCase);
    }
  }, [searchQuery, matchCase]);

  if (!isOpen) return null;

  const handleReplaceOne = () => {
    onReplace(replaceQuery);
    setStatusMessage('جایگزین شد');
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleReplaceAll = () => {
    const count = onReplaceAll(searchQuery, replaceQuery, matchCase);
    setStatusMessage(`${count} مورد جایگزین شد`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className="absolute top-14 end-6 z-30 w-96 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-4 text-xs text-[var(--text-primary)]">
      <div className="flex items-center justify-between mb-3 border-b border-[var(--border-color)] pb-2">
        <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <Search className="w-4 h-4 text-amber-500" />
          <span>جستجو و جایگزینی</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="space-y-2.5">
        <div>
          <div className="relative flex items-center">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در متن..."
              className="w-full ps-3 pe-20 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            />
            <div className="absolute end-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)] select-none">
              {totalMatches > 0 ? (
                <span>
                  {currentMatchIndex + 1} از {totalMatches}
                </span>
              ) : searchQuery ? (
                <span className="text-rose-500">یافت نشد</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Navigation & Options */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="rounded accent-amber-500 h-3.5 w-3.5"
            />
            <span>تطابق با حروف بزرگ و کوچک (Aa)</span>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={totalMatches === 0}
              onClick={onPrevMatch}
              className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] disabled:opacity-40 transition-colors"
              title="مورد قبلی"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={totalMatches === 0}
              onClick={onNextMatch}
              className="p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] disabled:opacity-40 transition-colors"
              title="مورد بعدی"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Replace Input */}
        <div>
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="جایگزین شود با..."
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-amber-500 focus:outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-emerald-500 flex items-center gap-1">
            {statusMessage && (
              <>
                <Check className="w-3 h-3" />
                <span>{statusMessage}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={totalMatches === 0 || !searchQuery}
              onClick={handleReplaceOne}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] disabled:opacity-40 transition-colors font-medium text-[var(--text-primary)]"
            >
              جایگزینی
            </button>
            <button
              type="button"
              disabled={totalMatches === 0 || !searchQuery}
              onClick={handleReplaceAll}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-neutral-950 font-semibold transition-colors flex items-center gap-1 shadow-xs"
            >
              <Replace className="w-3.5 h-3.5" />
              <span>جایگزینی همه</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
