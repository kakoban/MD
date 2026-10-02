import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MarkdownDoc,
  ViewMode,
  AppTheme,
  FontFamily,
  TextDirection,
  HighlightColor,
  DocStats,
  HeadingItem,
  BookletConfig,
  CloudSyncStatus,
} from './types';
import { SAMPLE_DOCUMENTS } from './data/sampleDocuments';
import {
  parseMarkdownToHtml,
  extractHeadings,
  calculateStats,
  detectDirection,
  toggleTaskInMarkdown,
} from './utils/markdownParser';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { DocSendSpaceView } from './components/DocSendSpaceView';
import { Editor, EditorHandle } from './components/Editor';
import { Preview } from './components/Preview';
import { PresentationView } from './components/PresentationView';
import { BookletModal } from './components/BookletModal';
import { CommunityModal } from './components/CommunityModal';
import { SharePublishModal } from './components/SharePublishModal';
import { TemplatesModal } from './components/TemplatesModal';
import { MarkdownTemplate } from './data/templates';
import { cloudApi } from './services/cloudApi';
import { Outline } from './components/Outline';
import { StatsBar } from './components/StatsBar';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { CheatsheetModal } from './components/CheatsheetModal';
import { SearchReplaceModal } from './components/SearchReplaceModal';
import { AuthModal } from './components/AuthModal';
import { AccessRequestModal } from './components/AccessRequestModal';
import { AccessRequestsManagerModal } from './components/AccessRequestsManagerModal';
import { SharedMarkdownFile } from './services/cloudApi';
import { ProfileModal } from './components/ProfileModal';
import { MyDocumentsModal } from './components/MyDocumentsModal';
import { authApi } from './services/authApi';
import { UserProfile } from './types';
import { Database, GitFork, Sparkles, Presentation as PresentationIcon } from 'lucide-react';

const STORAGE_KEY_DOCS = 'markdown_studio_docs_v2';
const STORAGE_KEY_ACTIVE = 'markdown_studio_active_id_v2';
const STORAGE_KEY_THEME = 'markdown_studio_theme_v3';
const STORAGE_KEY_FONT = 'markdown_studio_font_v2';

export default function App() {
  // State: Documents
  const [documents, setDocuments] = useState<MarkdownDoc[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load documents from localStorage', e);
    }
    return SAMPLE_DOCUMENTS;
  });

  // State: Active Document ID
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (savedId) return savedId;
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_DOCUMENTS[0].id;
  });

  // UI States (DocSend Space landing by default)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share') || params.get('file') ? 'preview' : 'workspace';
  });
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) return saved as AppTheme;
    } catch {}
    return 'light'; // Default to light theme as requested!
  });
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FONT);
      if (saved) return saved as FontFamily;
    } catch {}
    return 'vazir';
  });
  const [textDirection, setTextDirection] = useState<TextDirection>('auto');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookletModalOpen, setIsBookletModalOpen] = useState(false);
  const [bookletConfig, setBookletConfig] = useState<BookletConfig | null>(null);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [resetPasswordToken, setResetPasswordToken] = useState<string | null>(null);
  const [requestedAccessFile, setRequestedAccessFile] = useState<SharedMarkdownFile | null>(null);
  const [isAccessManagerOpen, setIsAccessManagerOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMyDocumentsModalOpen, setIsMyDocumentsModalOpen] = useState(false);
  const [cloudFilesCount, setCloudFilesCount] = useState<number>(0);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');
  const [localSaveStatus, setLocalSaveStatus] = useState<CloudSyncStatus>('synced');
  const localSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRenderRef = useRef<boolean>(true);
  const cloudSyncedStateRef = useRef<Record<string, { title: string; content: string }>>({});
  const isAutoSavingRef = useRef<boolean>(false);
  const pendingAutoSaveRef = useRef<{ id: string; title: string; content: string } | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Undo / Redo history for active document
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Cursor & Selection stats
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [selectionStats, setSelectionStats] = useState<{ chars: number; words: number } | null>(null);

  // Search state
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [lastSearchLen, setLastSearchLen] = useState(0);

  // Rendered HTML & Headings cache
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  const editorRef = useRef<EditorHandle>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Active Document memo
  const activeDoc = useMemo(() => {
    return documents.find((d) => d.id === activeDocId) || documents[0] || SAMPLE_DOCUMENTS[0];
  }, [documents, activeDocId]);

  // Save documents to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents', e);
    }
  }, [documents]);

  // Save active document ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeDocId);
    } catch (e) {}
  }, [activeDocId]);

  // Save theme & font preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
      localStorage.setItem(STORAGE_KEY_FONT, fontFamily);
    } catch (e) {}
  }, [theme, fontFamily]);

  // Reset history stack when switching documents
  useEffect(() => {
    if (activeDoc) {
      setHistory([activeDoc.content]);
      setHistoryIndex(0);
    }
  }, [activeDocId]);

  // Load cloud database stats from Neon and authenticate user session
  useEffect(() => {
    // Check authenticated user session
    authApi
      .getMe()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch(() => {});

    cloudApi
      .getHealth()
      .then((data) => {
        if (data?.stats?.totalFiles !== undefined) {
          setCloudFilesCount(data.stats.totalFiles);
        }
      })
      .catch((err) => {
        console.warn('Neon DB health check:', err.message);
      });
  }, []);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCloudNotice(`خوش آمدید ${user.displayName}! به حساب کاربری خود وارد شدید.`);
    setTimeout(() => setCloudNotice(null), 4000);
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setCloudNotice('با موفقیت از حساب کاربری خارج شدید.');
    setTimeout(() => setCloudNotice(null), 3500);
  };

  const handleOpenMyDocument = (file: any) => {
    const existing = documents.find((d) => d.id === file.id);
    if (existing) {
      setActiveDocId(existing.id);
    } else {
      const doc: MarkdownDoc = {
        id: file.id,
        title: file.title,
        content: file.content || '',
        createdAt: new Date(file.created_at).getTime(),
        updatedAt: new Date(file.updated_at).getTime(),
        tags: file.tags || [],
        isCloudShared: true,
        cloudAuthor: file.author_name,
        cloudSyncedAt: Date.now(),
      };
      setDocuments((prev) => [doc, ...prev]);
      setActiveDocId(doc.id);
    }
    setViewMode('split');
    setCloudNotice(`سند ابری «${file.title}» بارگذاری شد.`);
    setTimeout(() => setCloudNotice(null), 3000);
  };

  const fetchPendingRequestsCount = useCallback(() => {
    if (!currentUser) {
      setPendingRequestsCount(0);
      return;
    }
    cloudApi
      .getIncomingAccessRequests()
      .then((res) => {
        const pending = (res.requests || []).filter((r) => r.status === 'pending').length;
        setPendingRequestsCount(pending);
      })
      .catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    fetchPendingRequestsCount();
  }, [fetchPendingRequestsCount]);

  // Check URL query parameters for ?verify_token or ?reset_token or ?share=ID or ?file=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('reset_token') || params.get('reset');
    if (resetToken) {
      setResetPasswordToken(resetToken);
      setIsAuthModalOpen(true);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const verifyToken = params.get('verify_token') || params.get('verify');
    if (verifyToken) {
      authApi
        .verifyEmailToken(verifyToken)
        .then((res) => {
          if (res.user) {
            setCurrentUser(res.user);
            setIsConfettiActive(true);
            setTimeout(() => setIsConfettiActive(false), 5000);
            setCloudNotice(`🎉 حساب کاربری شما با موفقیت فعال شد! خوش آمدید @${res.user.username}`);
            setTimeout(() => setCloudNotice(null), 6000);
            // Clean url
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        })
        .catch((err) => {
          alert(err.message || 'خطا در فعال‌سازی حساب کاربری');
        });
    }

    const shareId = params.get('share') || params.get('file');

    if (shareId) {
      cloudApi
        .getFileById(shareId)
        .then((file) => {
          const doc: MarkdownDoc = {
            id: file.id,
            title: file.title,
            content: file.content || '',
            createdAt: new Date(file.created_at).getTime(),
            updatedAt: new Date(file.updated_at).getTime(),
            tags: file.tags,
            isCloudShared: true,
            cloudAuthor: file.author_name,
            cloudSyncedAt: Date.now(),
          };
          setDocuments((prev) => {
            const exists = prev.find((d) => d.id === file.id);
            if (exists) {
              return prev.map((d) => (d.id === file.id ? doc : d));
            }
            return [doc, ...prev];
          });
          setActiveDocId(file.id);
          cloudSyncedStateRef.current[file.id] = { title: file.title, content: file.content || '' };
          setCloudSyncStatus('synced');
          // Switch to distraction-free Reader View by default for shared links!
          setViewMode('preview');
          setCloudNotice(`فایل «${file.title}» در حالت مطالعه از مخزن ابری Neon باز شد.`);
          setTimeout(() => setCloudNotice(null), 5000);
        })
        .catch((err) => {
          console.error('Failed to load shared file from URL:', err);
        });
    }
  }, []);

  // Handler to open cloud document from community
  const handleOpenFileFromCommunity = useCallback((doc: MarkdownDoc) => {
    setDocuments((prev) => {
      const exists = prev.find((d) => d.id === doc.id);
      if (exists) {
        return prev.map((d) => (d.id === doc.id ? doc : d));
      }
      return [doc, ...prev];
    });
    setActiveDocId(doc.id);
    cloudSyncedStateRef.current[doc.id] = { title: doc.title, content: doc.content };
    setCloudSyncStatus('synced');
    setCloudNotice(`فایل «${doc.title}» از مخزن ابری بارگذاری شد.`);
    setTimeout(() => setCloudNotice(null), 4000);
  }, []);

  // Core function to push updates to Neon PostgreSQL
  const executeCloudSave = useCallback(
    async (id: string, title: string, content: string) => {
      if (isAutoSavingRef.current) {
        // Enqueue if another save request is in-flight
        pendingAutoSaveRef.current = { id, title, content };
        return;
      }

      isAutoSavingRef.current = true;
      setCloudSyncStatus('saving');

      try {
        await cloudApi.updateFile(id, { title, content });
        cloudSyncedStateRef.current[id] = { title, content };
        setCloudSyncStatus('synced');

        // Check if additional edits arrived while the request was in-flight
        if (pendingAutoSaveRef.current && pendingAutoSaveRef.current.id === id) {
          const queued = pendingAutoSaveRef.current;
          pendingAutoSaveRef.current = null;
          isAutoSavingRef.current = false;
          if (queued.title !== title || queued.content !== content) {
            await executeCloudSave(queued.id, queued.title, queued.content);
          }
        } else {
          isAutoSavingRef.current = false;
        }
      } catch (err: any) {
        console.error('Auto-save to Neon DB failed:', err);
        setCloudSyncStatus('error');
        isAutoSavingRef.current = false;
      }
    },
    []
  );

  // Auto-Save Effect: Periodically debounces and pushes changes of shared documents to Neon database
  useEffect(() => {
    if (!activeDoc || !activeDoc.isCloudShared) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setCloudSyncStatus('synced');
      return;
    }

    const last = cloudSyncedStateRef.current[activeDoc.id];
    if (!last) {
      cloudSyncedStateRef.current[activeDoc.id] = {
        title: activeDoc.title,
        content: activeDoc.content,
      };
      setCloudSyncStatus('synced');
      return;
    }

    const hasChanged = last.title !== activeDoc.title || last.content !== activeDoc.content;

    if (!hasChanged) {
      if (cloudSyncStatus !== 'saving') {
        setCloudSyncStatus('synced');
      }
      return;
    }

    // Changes detected! Set status to pending and start debounce timer
    setCloudSyncStatus('pending');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      executeCloudSave(activeDoc.id, activeDoc.title, activeDoc.content);
    }, 2000); // 2 second debounce for smooth typing

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [activeDoc?.id, activeDoc?.title, activeDoc?.content, activeDoc?.isCloudShared, executeCloudSave]);

  // Local Document Auto-Save Status: provides pending -> saving -> synced transitions for local notes
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!activeDoc || activeDoc.isCloudShared) return;

    setLocalSaveStatus('pending');
    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
    }
    localSaveTimerRef.current = setTimeout(() => {
      setLocalSaveStatus('saving');
      setTimeout(() => {
        setLocalSaveStatus('synced');
      }, 500);
    }, 600);

    return () => {
      if (localSaveTimerRef.current) {
        clearTimeout(localSaveTimerRef.current);
      }
    };
  }, [activeDoc?.title, activeDoc?.content, activeDoc?.isCloudShared]);

  const effectiveSyncStatus = activeDoc?.isCloudShared ? cloudSyncStatus : localSaveStatus;

  // Flush pending auto-save if window is closed or refreshed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeDoc && activeDoc.isCloudShared) {
        const last = cloudSyncedStateRef.current[activeDoc.id];
        if (last && (last.title !== activeDoc.title || last.content !== activeDoc.content)) {
          cloudApi
            .updateFile(activeDoc.id, {
              title: activeDoc.title,
              content: activeDoc.content,
            })
            .catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeDoc]);

  // Handler for manual retry / sync
  const handleManualSyncCloud = useCallback(() => {
    if (!activeDoc || !activeDoc.isCloudShared) return;
    executeCloudSave(activeDoc.id, activeDoc.title, activeDoc.content);
  }, [activeDoc, executeCloudSave]);

  // Handler for copying share link
  const handleCopyShareLink = () => {
    if (!activeDoc) return;
    const url = `${window.location.origin}/?share=${activeDoc.id}`;
    navigator.clipboard.writeText(url);
    setCloudNotice('لینک اختصاصی اشتراک این سند در کلیپ‌بورد کپی شد.');
    setTimeout(() => setCloudNotice(null), 3500);
  };

  // Handler for setting / updating writing goal
  const handleUpdateWordGoal = (newGoal: number | undefined) => {
    if (!activeDoc) return;
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocId
          ? { ...doc, wordGoal: newGoal, updatedAt: Date.now() }
          : doc
      )
    );
    if (newGoal) {
      setCloudNotice(`🎯 هدف نگارش این سند روی ${newGoal.toLocaleString('fa-IR')} کلمه تنظیم شد.`);
    } else {
      setCloudNotice('هدف نگارش حذف شد.');
    }
    setTimeout(() => setCloudNotice(null), 3000);
  };

  // Handler to fork a cloud document to local notes
  const handleForkDocument = (doc: MarkdownDoc) => {
    const forkedDoc: MarkdownDoc = {
      id: `doc-${Date.now()}`,
      title: `کپی از ${doc.title}`,
      content: doc.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: doc.tags ? [...doc.tags] : [],
      isForked: true,
      isCloudShared: false,
    };
    setDocuments((prev) => [forkedDoc, ...prev]);
    setActiveDocId(forkedDoc.id);
    setViewMode('split');
    setCloudNotice(`سند با موفقیت به اسناد شما کپی شد (Fork). اکنون می‌توانید آن را آزادانه ویرایش کنید.`);
    setTimeout(() => setCloudNotice(null), 5000);
  };

  // Handler to select and instantiate a template
  const handleSelectTemplate = (template: MarkdownTemplate) => {
    const newDoc: MarkdownDoc = {
      id: `doc-${Date.now()}`,
      title: template.title,
      content: template.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [...template.tags],
      isCloudShared: false,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setViewMode('split');
    setCloudNotice(`سند جدید بر اساس الگوی «${template.title}» ساخته شد.`);
    setTimeout(() => setCloudNotice(null), 4000);
  };

  // Re-parse markdown to HTML whenever active document content changes
  useEffect(() => {
    let isCancelled = false;
    if (activeDoc) {
      parseMarkdownToHtml(activeDoc.content).then((html) => {
        if (!isCancelled) {
          setRenderedHtml(html);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [activeDoc?.content]);

  // Compute stats and headings
  const stats: DocStats = useMemo(() => {
    return calculateStats(activeDoc?.content || '');
  }, [activeDoc?.content]);

  // Celebrate when user reaches their word goal
  const hasCelebratedGoalRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (activeDoc?.wordGoal && stats.words >= activeDoc.wordGoal) {
      if (!hasCelebratedGoalRef.current[activeDoc.id]) {
        hasCelebratedGoalRef.current[activeDoc.id] = true;
        setCloudNotice(`🎉 تبریک! به هدف نگارش ${activeDoc.wordGoal.toLocaleString('fa-IR')} کلمه رسیدید!`);
        setTimeout(() => setCloudNotice(null), 5000);
      }
    } else if (activeDoc?.wordGoal && stats.words < activeDoc.wordGoal) {
      hasCelebratedGoalRef.current[activeDoc.id] = false;
    }
  }, [activeDoc?.id, activeDoc?.wordGoal, stats.words]);

  const headings: HeadingItem[] = useMemo(() => {
    return extractHeadings(activeDoc?.content || '');
  }, [activeDoc?.content]);

  // Effective text direction (if 'auto', detect from content)
  const effectiveDirection = useMemo(() => {
    if (textDirection === 'auto') {
      return detectDirection(activeDoc?.content || '');
    }
    return textDirection;
  }, [textDirection, activeDoc?.content]);

  // Update active document content
  const handleContentChange = useCallback((newContent: string, pushToHistory = true) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDocId
          ? {
              ...doc,
              content: newContent,
              updatedAt: Date.now(),
            }
          : doc
      )
    );

    if (pushToHistory) {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(newContent);
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }
  }, [activeDocId, historyIndex]);

  // Update active document title
  const handleTitleChange = useCallback((newTitle: string) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDocId
          ? {
              ...doc,
              title: newTitle,
              updatedAt: Date.now(),
            }
          : doc
      )
    );
  }, [activeDocId]);

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevContent = history[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      handleContentChange(prevContent, false);
    }
  }, [history, historyIndex, handleContentChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextContent = history[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      handleContentChange(nextContent, false);
    }
  }, [history, historyIndex, handleContentChange]);

  // Document management: Create, Duplicate, Delete, Toggle Favorite
  const handleCreateDoc = useCallback(() => {
    const newDoc: MarkdownDoc = {
      id: `doc-${Date.now()}`,
      title: 'یادداشت جدید',
      content: `# یادداشت جدید\n\nاینجا شروع به نوشتن کنید یا از ==هایلایت زرد== و ==green:هایلایت سبز== استفاده نمایید...\n`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  }, []);

  const handleDuplicateDoc = useCallback((id: string) => {
    const target = documents.find((d) => d.id === id);
    if (!target) return;
    const duplicated: MarkdownDoc = {
      ...target,
      id: `doc-${Date.now()}`,
      title: `${target.title} (کپی)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDocuments((prev) => [duplicated, ...prev]);
    setActiveDocId(duplicated.id);
  }, [documents]);

  const handleDeleteDoc = useCallback((id: string) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      if (filtered.length === 0) {
        return SAMPLE_DOCUMENTS;
      }
      return filtered;
    });
    if (activeDocId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        setActiveDocId(remaining[0].id);
      }
    }
  }, [activeDocId, documents]);

  const handleToggleFavorite = useCallback((id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, isFavorite: !doc.isFavorite } : doc))
    );
  }, []);

  // Restore sample documents
  const handleRestoreSamples = useCallback(() => {
    if (confirm('آیا می‌خواهید اسناد نمونه اولیه را مجدداً به لیست یادداشت‌های خود اضافه کنید؟')) {
      setDocuments(SAMPLE_DOCUMENTS);
      setActiveDocId(SAMPLE_DOCUMENTS[0].id);
    }
  }, []);

  // Import files (.md, .txt, .markdown)
  const handleImportFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text !== undefined) {
          const title = file.name.replace(/\.(md|markdown|txt)$/i, '');
          const newDoc: MarkdownDoc = {
            id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: title || 'سند وارد شده',
            content: text,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setDocuments((prev) => [newDoc, ...prev]);
          setActiveDocId(newDoc.id);
        }
      };
      reader.readAsText(file);
    });
  }, []);

  // Interactive Task List Checkbox Click
  const handleToggleTask = useCallback((taskIndex: number) => {
    if (!activeDoc) return;
    const updated = toggleTaskInMarkdown(activeDoc.content, taskIndex);
    handleContentChange(updated, true);
  }, [activeDoc, handleContentChange]);

  // Live Teacher Highlighter from Preview
  const handleHighlightFromPreview = useCallback((selectedText: string, color: HighlightColor) => {
    if (!activeDoc || !selectedText.trim()) return;

    const trimmed = selectedText.trim();
    const currentContent = activeDoc.content;
    const tagPrefix = color === 'yellow' ? '==' : `==${color}:`;
    const tagSuffix = '==';

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. If already highlighted, update color
    const existingHighlightRegex = new RegExp(`==(?:[a-z]+:)?\\s*(${escapeRegex(trimmed)})\\s*==`, 'i');
    if (existingHighlightRegex.test(currentContent)) {
      const updated = currentContent.replace(existingHighlightRegex, `${tagPrefix}$1${tagSuffix}`);
      handleContentChange(updated, true);
      return;
    }

    // 2. Exact match
    const exactIdx = currentContent.indexOf(trimmed);
    if (exactIdx !== -1) {
      const updated =
        currentContent.slice(0, exactIdx) +
        `${tagPrefix}${trimmed}${tagSuffix}` +
        currentContent.slice(exactIdx + trimmed.length);
      handleContentChange(updated, true);
      return;
    }

    // 3. Flexible words match
    const words = trimmed.split(/\s+/).filter(Boolean).map(escapeRegex);
    if (words.length > 0) {
      const flexRegex = new RegExp(words.join('[\\s\\*\\_]+'));
      const match = flexRegex.exec(currentContent);
      if (match) {
        const matchedStr = match[0];
        const updated =
          currentContent.slice(0, match.index) +
          `${tagPrefix}${matchedStr}${tagSuffix}` +
          currentContent.slice(match.index + matchedStr.length);
        handleContentChange(updated, true);
      }
    }
  }, [activeDoc, handleContentChange]);

  // Remove highlight from Preview
  const handleRemoveHighlightFromPreview = useCallback((highlightedText: string) => {
    if (!activeDoc || !highlightedText.trim()) return;
    const trimmed = highlightedText.trim();
    const currentContent = activeDoc.content;
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const highlightRegex = new RegExp(`==(?:[a-z]+:)?\\s*(${escapeRegex(trimmed)})\\s*==`, 'i');
    if (highlightRegex.test(currentContent)) {
      const updated = currentContent.replace(highlightRegex, '$1');
      handleContentChange(updated, true);
    }
  }, [activeDoc, handleContentChange]);

  // Add Teacher Callout / Note
  const handleAddTeacherNote = useCallback((targetText: string, noteText: string) => {
    if (!activeDoc || !noteText.trim()) return;
    const currentContent = activeDoc.content;
    const trimmedTarget = targetText.trim();
    const noteCallout = `\n\n> [!TIP]\n> **یادداشت مدرس:** ${noteText.trim()}\n\n`;

    if (trimmedTarget && currentContent.includes(trimmedTarget)) {
      const targetIndex = currentContent.indexOf(trimmedTarget);
      const nextNewline = currentContent.indexOf('\n', targetIndex);
      const insertAt = nextNewline !== -1 ? nextNewline : currentContent.length;
      const updated = currentContent.slice(0, insertAt) + noteCallout + currentContent.slice(insertAt);
      handleContentChange(updated, true);
    } else {
      handleContentChange(currentContent + noteCallout, true);
    }
  }, [activeDoc, handleContentChange]);

  // Export handlers
  const handleExportMarkdown = useCallback(() => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.title || 'document'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeDoc]);

  const handleExportHtml = useCallback(() => {
    if (!activeDoc) return;
    const fullHtml = `<!DOCTYPE html>
<html lang="fa" dir="${effectiveDirection}">
<head>
  <meta charset="UTF-8">
  <title>${activeDoc.title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    body { font-family: 'Vazirmatn', system-ui, sans-serif; line-height: 1.8; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; background: #fff; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    mark.md-highlight { padding: 0.15em 0.35em; border-radius: 4px; }
    mark.md-highlight-yellow { background-color: #fef08a; }
    mark.md-highlight-green { background-color: #bbf7d0; }
    mark.md-highlight-blue { background-color: #bae6fd; }
    mark.md-highlight-pink { background-color: #fbcfe8; }
    mark.md-highlight-purple { background-color: #e9d5ff; }
    mark.md-highlight-orange { background-color: #fed7aa; }
    pre { background: #0f172a; color: #f8fafc; padding: 1em; border-radius: 8px; overflow-x: auto; }
    code { font-family: monospace; }
    blockquote { border-inline-start: 4px solid #f59e0b; padding-inline-start: 1em; margin: 1.5em 0; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin: 1.5em 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.title || 'document'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeDoc, effectiveDirection, renderedHtml]);

  const handlePrint = useCallback(() => {
    setBookletConfig(null);
    setTimeout(() => {
      window.print();
    }, 50);
  }, []);

  const handlePrintBooklet = useCallback((config: BookletConfig) => {
    setBookletConfig(config);
    setTimeout(() => {
      window.print();
    }, 150);
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    if (activeDoc) {
      navigator.clipboard.writeText(activeDoc.content);
    }
  }, [activeDoc]);

  const handleCopyHtml = useCallback(() => {
    navigator.clipboard.writeText(renderedHtml);
  }, [renderedHtml]);

  // Jump to heading in preview or editor
  const handleSelectHeading = useCallback((id: string, line?: number) => {
    if (line && editorRef.current) {
      editorRef.current.scrollToLine(line);
    }
    const previewEl = previewScrollRef.current;
    if (previewEl) {
      const headingTarget = previewEl.querySelector(`#${id}`);
      if (headingTarget) {
        headingTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // Search & Replace handlers
  const handleSearch = useCallback((query: string, matchCase: boolean) => {
    if (!activeDoc || !query) {
      setSearchMatches([]);
      return 0;
    }
    const text = activeDoc.content;
    const flags = matchCase ? 'g' : 'gi';
    try {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, flags);
      const matches: number[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match.index);
      }
      setSearchMatches(matches);
      setCurrentMatchIndex(0);
      return matches.length;
    } catch {
      return 0;
    }
  }, [activeDoc]);

  const handleNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    const charIndex = searchMatches[nextIdx];
    const textarea = editorRef.current?.getTextarea();
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(charIndex, charIndex);
    }
  }, [searchMatches, currentMatchIndex]);

  const handlePrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    const charIndex = searchMatches[prevIdx];
    const textarea = editorRef.current?.getTextarea();
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(charIndex, charIndex);
    }
  }, [searchMatches, currentMatchIndex]);

  const handleReplace = useCallback((replaceWith: string) => {
    if (!activeDoc || searchMatches.length === 0) return;
    const matchIndex = searchMatches[currentMatchIndex];
    if (matchIndex === undefined) return;

    // Get current query length
    const textarea = editorRef.current?.getTextarea();
    const queryLen = textarea ? textarea.selectionEnd - textarea.selectionStart : 0;
    const newContent =
      activeDoc.content.substring(0, matchIndex) +
      replaceWith +
      activeDoc.content.substring(matchIndex + Math.max(1, queryLen));

    handleContentChange(newContent, true);
  }, [activeDoc, searchMatches, currentMatchIndex, handleContentChange]);

  const handleReplaceAll = useCallback((query: string, replaceWith: string, matchCase: boolean) => {
    if (!activeDoc || !query) return 0;
    const flags = matchCase ? 'g' : 'gi';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    const matchesCount = (activeDoc.content.match(regex) || []).length;
    const replaced = activeDoc.content.replace(regex, replaceWith);
    handleContentChange(replaced, true);
    setSearchMatches([]);
    return matchesCount;
  }, [activeDoc, handleContentChange]);

  // Insert markdown helpers from toolbar
  const handleInsertMarkdown = useCallback((prefix: string, suffix?: string, defaultText?: string) => {
    editorRef.current?.insertMarkdown(prefix, suffix, defaultText);
  }, []);

  const handleInsertHighlight = useCallback((color: HighlightColor) => {
    editorRef.current?.insertHighlight(color);
  }, []);

  const handleInsertTable = useCallback((rows: number, cols: number) => {
    editorRef.current?.insertTable(rows, cols);
  }, []);

  const handleInsertCallout = useCallback((type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION') => {
    editorRef.current?.insertCallout(type);
  }, []);

  return (
    <div className={`theme-${theme} flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans`}>
      {/* Top Navbar */}
      <Navbar
        title={activeDoc?.title || ''}
        onTitleChange={handleTitleChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
        onThemeChange={setTheme}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        direction={textDirection}
        onDirectionChange={setTextDirection}
        onExportMarkdown={handleExportMarkdown}
        onExportHtml={handleExportHtml}
        onPrint={handlePrint}
        onOpenBookletModal={() => setIsBookletModalOpen(true)}
        onOpenCommunity={() => setIsCommunityOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        isCloudShared={activeDoc?.isCloudShared}
        cloudSyncStatus={cloudSyncStatus}
        onManualSyncCloud={handleManualSyncCloud}
        onCopyShareLink={handleCopyShareLink}
        cloudFilesCount={cloudFilesCount}
        onCopyMarkdown={handleCopyMarkdown}
        onCopyHtml={handleCopyHtml}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
        onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
        isOutlineOpen={isOutlineOpen}
        onOpenCheatsheet={() => setIsCheatsheetOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenMyDocuments={() => setIsMyDocumentsModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Formatting Toolbar (shown only in split and editor modes) */}
      {viewMode !== 'preview' && viewMode !== 'workspace' && (
        <Toolbar
          onInsertMarkdown={handleInsertMarkdown}
          onInsertHighlight={handleInsertHighlight}
          onInsertTable={handleInsertTable}
          onInsertCallout={handleInsertCallout}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onOpenCheatsheet={() => setIsCheatsheetOpen(true)}
        />
      )}

      {/* Main Workspace: Sidebar + Editor/Preview + Outline */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Management Sidebar (hidden in DocSend Workspace / Space landing) */}
        {viewMode !== 'workspace' && (
          <Sidebar
            documents={documents}
            activeDocId={activeDocId}
            onSelectDoc={setActiveDocId}
            onCreateDoc={handleCreateDoc}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onDeleteDoc={handleDeleteDoc}
            onDuplicateDoc={handleDuplicateDoc}
            onToggleFavorite={handleToggleFavorite}
            onImportFiles={handleImportFiles}
            onRestoreSamples={handleRestoreSamples}
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
            onOpenCloudDoc={handleOpenFileFromCommunity}
            onOpenPublishModal={() => setIsShareModalOpen(true)}
            currentUser={currentUser}
            onRequestAccess={(file) => setRequestedAccessFile(file)}
            onOpenAccessRequestsManager={() => setIsAccessManagerOpen(true)}
            pendingRequestsCount={pendingRequestsCount}
          />
        )}

        {/* Central Panes */}
        {viewMode === 'workspace' ? (
          <DocSendSpaceView
            documents={documents}
            currentUser={currentUser}
            onOpenDoc={(docId, mode = 'split') => {
              setActiveDocId(docId);
              setViewMode(mode);
            }}
            onCreateDoc={() => {
              handleCreateDoc();
              setViewMode('split');
            }}
            onOpenCloudDoc={async (file) => {
              const isOwner = currentUser && file.user_id === currentUser.id;
              const isApproved = file.my_access_status === 'approved';
              if (!file.is_public && !isOwner && !isApproved) {
                setRequestedAccessFile(file);
                return;
              }
              try {
                const fullDoc = await cloudApi.getFileById(file.id);
                const doc: MarkdownDoc = {
                  id: fullDoc.id,
                  title: fullDoc.title,
                  content: fullDoc.content || '',
                  createdAt: new Date(fullDoc.created_at).getTime(),
                  updatedAt: new Date(fullDoc.updated_at).getTime(),
                  tags: fullDoc.tags,
                  isCloudShared: true,
                  cloudAuthor: fullDoc.author_name,
                  cloudSyncedAt: Date.now(),
                };
                handleOpenFileFromCommunity(doc);
                setViewMode('split');
              } catch (err: any) {
                if (err.isLocked) {
                  setRequestedAccessFile(file);
                } else {
                  alert(err.message || 'خطا در بارگذاری فایل');
                }
              }
            }}
            onImportFiles={handleImportFiles}
            onOpenTemplates={() => setIsTemplatesOpen(true)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenAccessRequestsManager={() => setIsAccessManagerOpen(true)}
            pendingRequestsCount={pendingRequestsCount}
          />
        ) : (
          <main className="flex-1 flex overflow-hidden relative">
          {/* Editor Pane */}
          {(viewMode === 'split' || viewMode === 'editor') && (
            <Editor
              ref={editorRef}
              value={activeDoc?.content || ''}
              onChange={handleContentChange}
              fontFamily={fontFamily}
              direction={effectiveDirection}
              showLineNumbers={true}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
              onSelectionChange={setSelectionStats}
              onOpenSearch={() => setIsSearchOpen(true)}
              onSave={handleExportMarkdown}
            />
          )}

          {/* Divider in Split Mode */}
          {viewMode === 'split' && (
            <div className="w-[1px] bg-[var(--border-color)] shrink-0 select-none relative group">
              <div className="absolute inset-y-0 -start-1 -end-1 cursor-col-resize hover:bg-amber-500/20" />
            </div>
          )}

          {/* Preview Pane with Reader Mode Header for Shared Docs */}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Shared Doc Reader Mode Banner (DocSend Clean Style) */}
              {activeDoc?.isCloudShared && (
                <div className="no-print mx-4 mt-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-2 text-xs shrink-0 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-semibold text-xs text-[var(--text-secondary)]">
                      سند اشتراکی ابری
                    </span>
                    {activeDoc.cloudAuthor && (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        • نویسنده: <strong className="text-[var(--text-primary)]">{activeDoc.cloudAuthor}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleForkDocument(activeDoc)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 font-bold text-xs transition-colors"
                      title="ایجاد نسخه کپی در اسناد محلی شما جهت ویرایش"
                    >
                      <GitFork className="w-3 h-3" />
                      <span>کپی و ویرایش (Fork)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('presentation')}
                      className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-amber-500 transition-colors"
                      title="مشاهده در حالت ارائه / اسلاید"
                    >
                      <PresentationIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <Preview
                scrollRef={previewScrollRef}
                html={renderedHtml}
                fontFamily={fontFamily}
                direction={effectiveDirection}
                onToggleTask={handleToggleTask}
                onHighlightText={handleHighlightFromPreview}
                onRemoveHighlight={handleRemoveHighlightFromPreview}
                onAddTeacherNote={handleAddTeacherNote}
              />
            </div>
          )}

          {/* Search & Replace Floating Window */}
          <SearchReplaceModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSearch={handleSearch}
            onReplace={handleReplace}
            onReplaceAll={handleReplaceAll}
            onNextMatch={handleNextMatch}
            onPrevMatch={handlePrevMatch}
            currentMatchIndex={currentMatchIndex}
            totalMatches={searchMatches.length}
          />
        </main>
        )}

        {/* Document Outline / TOC Drawer */}
        <Outline
          headings={headings}
          isOpen={isOutlineOpen}
          onClose={() => setIsOutlineOpen(false)}
          onSelectHeading={handleSelectHeading}
        />
      </div>

      {/* Bottom Status Bar (hidden in Workspace / Space mode) */}
      {viewMode !== 'workspace' && (
        <StatsBar
          stats={stats}
          direction={effectiveDirection}
          cursorPos={cursorPos}
          selectionStats={selectionStats}
          wordGoal={activeDoc?.wordGoal}
          onUpdateWordGoal={handleUpdateWordGoal}
          onGoalMet={() => setIsConfettiActive(true)}
          syncStatus={effectiveSyncStatus}
        />
      )}

      {/* Interactive Full-Screen Confetti Celebration Overlay */}
      {isConfettiActive && (
        <ConfettiOverlay
          targetWords={activeDoc?.wordGoal}
          currentWords={stats.words}
          onClose={() => setIsConfettiActive(false)}
        />
      )}

      {/* Cheatsheet Modal */}
      <CheatsheetModal
        isOpen={isCheatsheetOpen}
        onClose={() => setIsCheatsheetOpen(false)}
        onInsertExample={(text) => handleInsertMarkdown(text + '\n')}
      />

      {/* Pro Booklet Modal (Print / Save-as-PDF Publisher) */}
      <BookletModal
        isOpen={isBookletModalOpen}
        onClose={() => setIsBookletModalOpen(false)}
        documentTitle={activeDoc?.title || ''}
        onPrintBooklet={handlePrintBooklet}
      />

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Cloud Community Files Modal */}
      <CommunityModal
        isOpen={isCommunityOpen}
        onClose={() => {
          setIsCommunityOpen(false);
          cloudApi
            .getHealth()
            .then((h) => {
              if (h?.stats?.totalFiles !== undefined) {
                setCloudFilesCount(h.stats.totalFiles);
              }
            })
            .catch(() => {});
        }}
        onOpenFileInEditor={handleOpenFileFromCommunity}
        onOpenPublishModal={() => setIsShareModalOpen(true)}
      />

      {/* Cloud Share & Publish Modal */}
      <SharePublishModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        documentTitle={activeDoc?.title || ''}
        documentContent={activeDoc?.content || ''}
        defaultAuthor={currentUser?.displayName}
        onPublishedSuccess={(shareId) => {
          setCloudFilesCount((prev) => prev + 1);
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === activeDocId
                ? { ...d, isCloudShared: true, cloudSyncedAt: Date.now() }
                : d
            )
          );
          if (activeDoc) {
            cloudSyncedStateRef.current[activeDoc.id] = { title: activeDoc.title, content: activeDoc.content };
            setCloudSyncStatus('synced');
          }
          setCloudNotice('سند با موفقیت در پایگاه داده ابری Neon منتشر شد.');
          setTimeout(() => setCloudNotice(null), 4000);
        }}
        onOpenCommunity={() => setIsCommunityOpen(true)}
      />

      {/* User Authentication Modal (Login / Register / Password Reset) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setResetPasswordToken(null);
        }}
        onSuccess={handleLoginSuccess}
        initialMode={resetPasswordToken ? 'reset' : 'login'}
        resetToken={resetPasswordToken}
      />

      {/* Access Request Modal (for locked/private files) */}
      <AccessRequestModal
        isOpen={Boolean(requestedAccessFile)}
        file={requestedAccessFile}
        currentUser={currentUser}
        onClose={() => setRequestedAccessFile(null)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onRequestSent={() => {
          setCloudNotice("درخواست دسترسی با موفقیت ارسال شد.");
          setTimeout(() => setCloudNotice(null), 4000);
        }}
      />

      {/* Access Requests Manager Modal (for document owners) */}
      <AccessRequestsManagerModal
        isOpen={isAccessManagerOpen}
        onClose={() => setIsAccessManagerOpen(false)}
        onRequestsUpdated={fetchPendingRequestsCount}
      />

      {/* User Profile Modal */}
      {currentUser && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          onUserUpdated={setCurrentUser}
          onLogout={handleLogout}
        />
      )}

      {/* User's Cloud Documents Modal */}
      <MyDocumentsModal
        isOpen={isMyDocumentsModalOpen}
        onClose={() => setIsMyDocumentsModalOpen(false)}
        onOpenDocument={handleOpenMyDocument}
        userName={currentUser?.displayName}
      />

      {/* Cloud Toast Notice */}
      {cloudNotice && (
        <div className="fixed bottom-12 start-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-2xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{cloudNotice}</span>
        </div>
      )}

      {/* Presentation / Teacher Slides Mode */}
      {viewMode === 'presentation' && activeDoc && (
        <PresentationView
          markdown={activeDoc.content}
          title={activeDoc.title}
          fontFamily={fontFamily}
          direction={effectiveDirection}
          onExit={() => setViewMode('preview')}
          onToggleTask={handleToggleTask}
        />
      )}

      {/* Hidden Booklet Cover & Watermark (Rendered during Print) */}
      {bookletConfig && (
        <>
          {bookletConfig.includeCover && (
            <div className="booklet-cover-page" dir={effectiveDirection}>
              <div className="text-sm font-semibold tracking-wider text-neutral-500 uppercase border-b border-neutral-300 pb-4">
                {bookletConfig.institution || 'آکادمی آموزش تخصصی'}
              </div>
              <div className="my-auto space-y-6 py-12">
                <h1 className="text-4xl font-extrabold text-neutral-900 leading-tight">
                  {activeDoc?.title || 'کتابچه و جزوه آموزشی'}
                </h1>
                {bookletConfig.subtitle && (
                  <p className="text-xl text-neutral-600 font-medium">
                    {bookletConfig.subtitle}
                  </p>
                )}
                <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full mt-6" />
              </div>
              <div className="border-t border-neutral-300 pt-4 flex items-center justify-between text-xs text-neutral-600">
                <div>
                  <strong>مدرس / مؤلف:</strong> {bookletConfig.authorName || 'مدرس دوره'}
                </div>
                {bookletConfig.showDate && (
                  <div>
                    <strong>تاریخ انتشار:</strong> {new Date().toLocaleDateString('fa-IR')}
                  </div>
                )}
              </div>
            </div>
          )}
          {bookletConfig.watermark && (
            <div className="booklet-watermark-overlay" aria-hidden="true">
              {bookletConfig.watermark}
            </div>
          )}
        </>
      )}
    </div>
  );
}
