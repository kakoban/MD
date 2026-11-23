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
  UserProfile,
  DocVisibility,
  FolderItem,
} from './types';
import {
  parseMarkdownToHtml,
  extractHeadings,
  calculateStats,
  detectDirection,
  toggleTaskInMarkdown,
} from './utils/markdownParser';
import { buildShareUrl, copyTextToClipboard } from './utils/shareLink';
import { Navbar } from './components/Navbar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Editor, EditorHandle } from './components/Editor';
import { Preview } from './components/Preview';
import { PresentationView } from './components/PresentationView';
import { BookletModal } from './components/BookletModal';
import { CommunityModal } from './components/CommunityModal';
import { SharePublishModal } from './components/SharePublishModal';
import { WorkspaceDashboard } from './components/WorkspaceDashboard';
import { cloudApi, SharedMarkdownFile } from './services/cloudApi';
import { Outline } from './components/Outline';
import { StatsBar } from './components/StatsBar';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { CheatsheetModal } from './components/CheatsheetModal';
import { SearchReplaceModal } from './components/SearchReplaceModal';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { MyDocumentsModal } from './components/MyDocumentsModal';
import { McpBridgeModal } from './components/McpBridgeModal';
import { OAuthConsentView } from './components/OAuthConsentView';
import { FolderSelection } from './components/FolderTree';
import { authApi } from './services/authApi';
import { memoryApi, buildFolderPathMap } from './services/memoryApi';
import {
  GitFork,
  Upload,
  LogIn,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Eye,
} from 'lucide-react';

const STORAGE_KEY_THEME = 'markdown_studio_theme_v4';
const STORAGE_KEY_FONT = 'markdown_studio_font_v2';

function mapServerFileToDoc(file: SharedMarkdownFile, currentUserId?: string): MarkdownDoc {
  const visibility: DocVisibility =
    file.visibility === 'public' || file.visibility === 'unlisted' || file.visibility === 'private'
      ? file.visibility
      : file.is_public
      ? 'public'
      : 'private';

  return {
    id: file.id,
    title: file.title,
    content: file.content || '',
    description: file.description || '',
    createdAt: new Date(file.created_at).getTime(),
    updatedAt: new Date(file.updated_at).getTime(),
    isFavorite: Boolean(file.is_favorite),
    tags: file.tags || [],
    visibility,
    isCloudShared: true,
    cloudAuthor: file.author_name,
    userId: file.user_id,
    folderId: file.folder_id ?? null,
    isOwner: file.is_owner ?? Boolean(currentUserId && file.user_id === currentUserId),
    cloudSyncedAt: Date.now(),
  };
}

export default function App() {
  // User & Session state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [workspaceView, setWorkspaceView] = useState<'dashboard' | 'editor'>('dashboard');

  // Authenticated user's personal documents & folders (strictly isolated per user)
  const [documents, setDocuments] = useState<MarkdownDoc[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>('all');
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [activeDocId, setActiveDocId] = useState<string>('');

  // Guest transient local-only document (RAM only, never persisted)
  const [guestDoc, setGuestDoc] = useState<{ title: string; content: string } | null>(null);
  const [isGuestDragging, setIsGuestDragging] = useState(false);
  const guestFileInputRef = useRef<HTMLInputElement>(null);

  // Read-only Shared Link Document (?share=ID or Explore preview)
  const [sharedViewDoc, setSharedViewDoc] = useState<MarkdownDoc | null>(null);
  const [sharedLinkLoading, setSharedLinkLoading] = useState<boolean>(false);
  const [sharedLinkError, setSharedLinkError] = useState<string | null>(null);

  // UI & Editor States
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [guestViewMode, setGuestViewMode] = useState<'split' | 'editor' | 'preview'>('preview');
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved) return saved as AppTheme;
    } catch {}
    return 'academic';
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
  const [shareTargetDocId, setShareTargetDocId] = useState<string | null>(null);
  const [isConfettiActive, setIsConfettiActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMyDocumentsModalOpen, setIsMyDocumentsModalOpen] = useState(false);
  const [isMcpBridgeOpen, setIsMcpBridgeOpen] = useState(false);
  const [exploreFilesCount, setExploreFilesCount] = useState<number>(0);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');

  const cloudSyncedStateRef = useRef<Record<string, { title: string; content: string }>>({});
  const isAutoSavingRef = useRef<boolean>(false);
  const pendingAutoSaveRef = useRef<{ id: string; title: string; content: string } | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo / Redo history for active document
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Cursor & Selection stats
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [selectionStats, setSelectionStats] = useState<{ chars: number; words: number } | null>(null);

  // Search state
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Rendered HTML cache
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  const editorRef = useRef<EditorHandle>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const showNotice = useCallback((msg: string, duration = 3800) => {
    setToastNotice(msg);
    setTimeout(() => {
      setToastNotice((prev) => (prev === msg ? null : prev));
    }, duration);
  }, []);

  // Clean up any legacy shared browser storage keys on mount
  useEffect(() => {
    try {
      localStorage.removeItem('markdown_studio_docs_v2');
      localStorage.removeItem('markdown_studio_active_id_v2');
      localStorage.removeItem('markdown_author_name');
    } catch {}
  }, []);

  // Save theme & font preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
      localStorage.setItem(STORAGE_KEY_FONT, fontFamily);
    } catch {}
  }, [theme, fontFamily]);

  // Load authenticated user's personal documents & folders
  const loadUserDocuments = useCallback(async (user: UserProfile) => {
    setIsLoadingDocs(true);
    try {
      const [files, userFolders] = await Promise.all([
        authApi.getMyDocuments(),
        memoryApi.getFolders().catch(() => [] as FolderItem[]),
      ]);
      const mapped = files.map((f) => mapServerFileToDoc(f, user.id));
      setDocuments(mapped);
      setFolders(userFolders);
      mapped.forEach((d) => {
        cloudSyncedStateRef.current[d.id] = { title: d.title, content: d.content };
      });
      setActiveDocId((prev) => (mapped.some((d) => d.id === prev) ? prev : mapped[0]?.id || ''));
    } catch (err) {
      console.error('Failed to load user documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, []);

  // Authenticate user session (via HttpOnly cookie or in-memory token) and fetch public explore count on mount
  useEffect(() => {
    let mounted = true;
    authApi
      .getMe()
      .then(async (user) => {
        if (!mounted) return;
        if (user) {
          setCurrentUser(user);
          await loadUserDocuments(user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsAuthChecking(false);
      });

    cloudApi
      .getHealth()
      .then((data) => {
        if (mounted && data?.stats?.totalFiles !== undefined) {
          setExploreFilesCount(data.stats.totalFiles);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [loadUserDocuments]);

  // Check URL query parameters for ?share=ID or ?file=ID
  const loadSharedLinkFromUrl = useCallback(async (user: UserProfile | null) => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share') || params.get('file');
    if (!shareId) return;

    setSharedLinkLoading(true);
    setSharedLinkError(null);

    try {
      const file = await cloudApi.getFileById(shareId);
      const doc = mapServerFileToDoc(file, user?.id);

      if (user && doc.isOwner) {
        // Owner opened their own link -> open in full editor inside their workspace
        setDocuments((prev) => {
          const exists = prev.find((d) => d.id === doc.id);
          return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...prev];
        });
        cloudSyncedStateRef.current[doc.id] = { title: doc.title, content: doc.content };
        setActiveDocId(doc.id);
        setSharedViewDoc(null);
        setWorkspaceView('editor');
        setViewMode('split');
      } else {
        setSharedViewDoc(doc);
      }
    } catch (err: any) {
      setSharedLinkError(err.message || 'خطا در باز کردن سند اشتراکی');
      setSharedViewDoc(null);
    } finally {
      setSharedLinkLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthChecking) {
      loadSharedLinkFromUrl(currentUser);
    }
  }, [isAuthChecking, currentUser?.id, loadSharedLinkFromUrl]);

  const activeDoc = useMemo(() => {
    if (sharedViewDoc) return sharedViewDoc;
    return documents.find((d) => d.id === activeDocId) || null;
  }, [documents, activeDocId, sharedViewDoc]);

  const shareTargetDoc = useMemo(() => {
    if (shareTargetDocId) {
      return documents.find((d) => d.id === shareTargetDocId) || activeDoc;
    }
    return activeDoc;
  }, [documents, shareTargetDocId, activeDoc]);

  // Content used for rendering preview HTML
  const previewSourceContent = useMemo(() => {
    if (sharedViewDoc) return sharedViewDoc.content;
    if (!currentUser) return guestDoc?.content || '';
    return activeDoc?.content || '';
  }, [sharedViewDoc, currentUser, guestDoc?.content, activeDoc?.content]);

  // Re-parse markdown to HTML whenever active content changes
  useEffect(() => {
    let isCancelled = false;
    if (previewSourceContent) {
      parseMarkdownToHtml(previewSourceContent).then((html) => {
        if (!isCancelled) {
          setRenderedHtml(html);
        }
      });
    } else {
      setRenderedHtml('');
    }
    return () => {
      isCancelled = true;
    };
  }, [previewSourceContent]);

  // Reset undo history when switching documents
  useEffect(() => {
    if (activeDoc && !sharedViewDoc) {
      setHistory([activeDoc.content]);
      setHistoryIndex(0);
    }
  }, [activeDocId, sharedViewDoc]);

  const handleLoginSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    setGuestDoc(null);
    await loadUserDocuments(user);
    if (!sharedViewDoc) {
      setWorkspaceView('dashboard');
    }
    showNotice(`خوش آمدید ${user.displayName}! فضای کار اختصاصی شما آماده است.`);
  };

  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setDocuments([]);
    setFolders([]);
    setSelectedFolder('all');
    setActiveDocId('');
    cloudSyncedStateRef.current = {};
    setGuestDoc(null);
    setWorkspaceView('dashboard');
    setIsProfileModalOpen(false);
    setIsMyDocumentsModalOpen(false);
    setIsMcpBridgeOpen(false);
    setIsCommunityOpen(false);
    setIsShareModalOpen(false);
    setIsBookletModalOpen(false);

    // If viewing a private doc or logged-in explore doc, clear sharedViewDoc unless ?share= is in URL
    const params = new URLSearchParams(window.location.search);
    if (!params.get('share') && !params.get('file')) {
      setSharedViewDoc(null);
    }
    showNotice('از حساب کاربری خود خارج شدید.');
  };

  const clearShareUrlParam = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('share') || url.searchParams.has('file')) {
      url.searchParams.delete('share');
      url.searchParams.delete('file');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  // Auto-save updates for authenticated user's documents
  const executeCloudSave = useCallback(async (id: string, title: string, content: string) => {
    if (isAutoSavingRef.current) {
      pendingAutoSaveRef.current = { id, title, content };
      return;
    }

    isAutoSavingRef.current = true;
    setCloudSyncStatus('saving');

    try {
      await cloudApi.updateFile(id, { title, content });
      cloudSyncedStateRef.current[id] = { title, content };
      setCloudSyncStatus('synced');

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
    } catch (err) {
      console.error('Auto-save failed:', err);
      setCloudSyncStatus('error');
      isAutoSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!currentUser || workspaceView !== 'editor' || sharedViewDoc || !activeDoc || !activeDoc.isOwner) {
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

    setCloudSyncStatus('pending');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      executeCloudSave(activeDoc.id, activeDoc.title, activeDoc.content);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    currentUser,
    workspaceView,
    sharedViewDoc,
    activeDoc?.id,
    activeDoc?.title,
    activeDoc?.content,
    activeDoc?.isOwner,
    executeCloudSave,
  ]);

  // Flush unsaved changes before tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser && activeDoc && activeDoc.isOwner && !sharedViewDoc) {
        const last = cloudSyncedStateRef.current[activeDoc.id];
        if (last && (last.title !== activeDoc.title || last.content !== activeDoc.content)) {
          cloudApi.updateFile(activeDoc.id, { title: activeDoc.title, content: activeDoc.content }).catch(() => {});
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser, activeDoc, sharedViewDoc]);

  const handleManualSyncCloud = useCallback(() => {
    if (!activeDoc || !activeDoc.isOwner) return;
    executeCloudSave(activeDoc.id, activeDoc.title, activeDoc.content);
  }, [activeDoc, executeCloudSave]);

  // Compute stats and headings
  const stats: DocStats = useMemo(() => {
    return calculateStats(activeDoc?.content || '');
  }, [activeDoc?.content]);

  const hasCelebratedGoalRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (activeDoc?.wordGoal && stats.words >= activeDoc.wordGoal) {
      if (!hasCelebratedGoalRef.current[activeDoc.id]) {
        hasCelebratedGoalRef.current[activeDoc.id] = true;
        showNotice(`به هدف نگارش ${activeDoc.wordGoal.toLocaleString('fa-IR')} کلمه رسیدید!`, 5000);
      }
    } else if (activeDoc?.wordGoal && stats.words < activeDoc.wordGoal) {
      hasCelebratedGoalRef.current[activeDoc.id] = false;
    }
  }, [activeDoc?.id, activeDoc?.wordGoal, stats.words, showNotice]);

  const headings: HeadingItem[] = useMemo(() => {
    return extractHeadings(activeDoc?.content || '');
  }, [activeDoc?.content]);

  const effectiveDirection = useMemo(() => {
    if (textDirection === 'auto') {
      return detectDirection(previewSourceContent);
    }
    return textDirection;
  }, [textDirection, previewSourceContent]);

  // Guest local file opening
  const openLocalFileForGuest = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text !== undefined) {
        const title = file.name.replace(/\.(md|markdown|txt)$/i, '') || file.name;
        setGuestDoc({ title, content: text });
        setGuestViewMode('preview');
      }
    };
    reader.readAsText(file);
  };

  const handleGuestFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      openLocalFileForGuest(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleGuestExportMarkdown = () => {
    if (!guestDoc) return;
    const blob = new Blob([guestDoc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${guestDoc.title || 'document'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Folder Management Handlers
  const handleCreateFolder = useCallback(
    async (name: string, parentId: string | null) => {
      if (!currentUser) return;
      try {
        const trimmed = name.trim();
        if (!trimmed) return;

        // If user entered slash-separated nested path (e.g. "memory/projects"), ensure full path
        if (trimmed.includes('/') || trimmed.includes('\\')) {
          const pathMap = buildFolderPathMap(folders);
          const basePath = parentId ? pathMap.get(parentId) || '' : '';
          const combined = basePath ? `${basePath}/${trimmed}` : trimmed;
          const res = await memoryApi.ensureFolderPath(combined);
          setFolders(res.folders);
          if (res.folder) setSelectedFolder(res.folder.id);
          showNotice(`مسیر پوشه «${res.path}» ایجاد شد.`);
        } else {
          const res = await memoryApi.createFolder({ name: trimmed, parentId });
          setFolders(res.folders);
          setSelectedFolder(res.folder.id);
          showNotice(`پوشه «${res.folder.name}» ایجاد شد.`);
        }
      } catch (err: any) {
        showNotice(err.message || 'خطا در ایجاد پوشه');
      }
    },
    [currentUser, folders, showNotice]
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, newName: string) => {
      if (!currentUser) return;
      try {
        const res = await memoryApi.updateFolder(folderId, { name: newName.trim() });
        setFolders(res.folders);
        showNotice(`نام پوشه به «${res.folder.name}» تغییر یافت.`);
      } catch (err: any) {
        showNotice(err.message || 'خطا در تغییر نام پوشه');
      }
    },
    [currentUser, showNotice]
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      if (!currentUser) return;
      try {
        const res = await memoryApi.deleteFolder(folderId, 'move-to-parent');
        setFolders(res.folders);
        if (selectedFolder === folderId) {
          setSelectedFolder('all');
        }
        // Reload documents so moved files reflect their new parent folderId
        const files = await authApi.getMyDocuments();
        setDocuments(files.map((f) => mapServerFileToDoc(f, currentUser.id)));
        showNotice('پوشه حذف شد و اسناد آن به سطح بالاتر منتقل شدند.');
      } catch (err: any) {
        showNotice(err.message || 'خطا در حذف پوشه');
      }
    },
    [currentUser, selectedFolder, showNotice]
  );

  const handleMoveDocToFolder = useCallback(
    async (docId: string, folderId: string | null) => {
      if (!currentUser) return;
      try {
        await cloudApi.updateFile(docId, { folder_id: folderId });
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, folderId, updatedAt: Date.now() } : d))
        );
        const pathMap = buildFolderPathMap(folders);
        const targetLabel = folderId ? pathMap.get(folderId) || 'پوشه' : 'ریشه (بدون پوشه)';
        showNotice(`سند به «${targetLabel}» منتقل شد.`);
      } catch (err: any) {
        showNotice(err.message || 'خطا در انتقال سند به پوشه');
      }
    },
    [currentUser, folders, showNotice]
  );

  // Authenticated Document Management (Persisted to Server under user's ID, default 'private')
  const handleCreateDoc = useCallback(async () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const defaultTitle = 'سند جدید';
    const defaultContent = `# سند جدید\n\nنوشتن را از اینجا شروع کنید...\n`;
    const targetFolderId =
      selectedFolder !== 'all' && selectedFolder !== 'root' ? selectedFolder : null;
    try {
      const res = await cloudApi.publishFile({
        title: defaultTitle,
        content: defaultContent,
        visibility: 'private',
        is_public: false,
        folder_id: targetFolderId,
      });
      const newDoc = mapServerFileToDoc(res.file, currentUser.id);
      cloudSyncedStateRef.current[newDoc.id] = { title: newDoc.title, content: newDoc.content };
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      setSharedViewDoc(null);
      setWorkspaceView('editor');
      setViewMode('split');
    } catch (err: any) {
      showNotice(err.message || 'خطا در ایجاد سند جدید');
    }
  }, [currentUser, selectedFolder, showNotice]);

  const handleDuplicateDoc = useCallback(
    async (id: string) => {
      if (!currentUser) return;
      const target = documents.find((d) => d.id === id);
      if (!target) return;
      try {
        const res = await cloudApi.publishFile({
          title: `${target.title} (کپی)`,
          content: target.content,
          description: target.description || '',
          tags: target.tags || [],
          visibility: 'private',
          is_public: false,
          folder_id: target.folderId ?? null,
        });
        const duplicated = mapServerFileToDoc(res.file, currentUser.id);
        cloudSyncedStateRef.current[duplicated.id] = {
          title: duplicated.title,
          content: duplicated.content,
        };
        setDocuments((prev) => [duplicated, ...prev]);
        setActiveDocId(duplicated.id);
        setWorkspaceView('editor');
      } catch (err: any) {
        showNotice(err.message || 'خطا در تکثیر سند');
      }
    },
    [currentUser, documents, showNotice]
  );

  const handleDeleteDoc = useCallback(
    async (id: string) => {
      try {
        await cloudApi.deleteFile(id);
        delete cloudSyncedStateRef.current[id];
        setDocuments((prev) => {
          const remaining = prev.filter((d) => d.id !== id);
          if (activeDocId === id) {
            if (remaining.length > 0) {
              setActiveDocId(remaining[0].id);
            } else {
              setActiveDocId('');
              setWorkspaceView('dashboard');
            }
          }
          return remaining;
        });
        showNotice('سند با موفقیت حذف شد.');
      } catch (err: any) {
        showNotice(err.message || 'خطا در حذف سند');
      }
    },
    [activeDocId, showNotice]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const target = documents.find((d) => d.id === id);
      if (!target) return;
      const nextFav = !target.isFavorite;
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, isFavorite: nextFav } : doc))
      );
      try {
        await cloudApi.updateFile(id, { is_favorite: nextFav });
      } catch {}
    },
    [documents]
  );

  const handleImportFiles = useCallback(
    async (files: FileList) => {
      if (!currentUser) return;
      const validFiles = Array.from(files).filter((f) =>
        /\.(md|markdown|txt)$/i.test(f.name)
      );
      if (validFiles.length === 0) {
        showNotice('لطفاً فایل‌هایی با پسوند .md، .markdown یا .txt انتخاب کنید.');
        return;
      }

      const baseFolderId =
        selectedFolder !== 'all' && selectedFolder !== 'root' ? selectedFolder : null;
      const pathMap = buildFolderPathMap(folders);
      const basePath = baseFolderId ? pathMap.get(baseFolderId) || '' : '';
      const ensuredPathCache = new Map<string, string | null>();
      let latestFolders: FolderItem[] | null = null;
      const createdDocs: MarkdownDoc[] = [];

      for (const file of validFiles) {
        try {
          const text = await file.text();
          const title = file.name.replace(/\.(md|markdown|txt)$/i, '') || 'سند وارد شده';

          // Preserve nested folder structure when uploading a directory (webkitRelativePath)
          let targetFolderId: string | null = baseFolderId;
          const relPath = ((file as any).webkitRelativePath as string | undefined) || '';
          if (relPath && relPath.includes('/')) {
            const parts = relPath.split('/').filter(Boolean);
            parts.pop(); // remove filename
            if (parts.length > 0) {
              const relFolderPath = parts.join('/');
              const combinedPath = basePath ? `${basePath}/${relFolderPath}` : relFolderPath;
              if (ensuredPathCache.has(combinedPath)) {
                targetFolderId = ensuredPathCache.get(combinedPath) ?? null;
              } else {
                const ensured = await memoryApi.ensureFolderPath(combinedPath);
                targetFolderId = ensured.folder?.id ?? null;
                ensuredPathCache.set(combinedPath, targetFolderId);
                latestFolders = ensured.folders;
              }
            }
          }

          const res = await cloudApi.publishFile({
            title,
            content: text,
            visibility: 'private',
            is_public: false,
            folder_id: targetFolderId,
          });
          const newDoc = mapServerFileToDoc(res.file, currentUser.id);
          cloudSyncedStateRef.current[newDoc.id] = { title: newDoc.title, content: newDoc.content };
          createdDocs.push(newDoc);
        } catch (err: any) {
          showNotice(err.message || 'خطا در ذخیره فایل وارد شده');
        }
      }

      if (latestFolders) {
        setFolders(latestFolders);
      }

      if (createdDocs.length > 0) {
        setDocuments((prev) => [...createdDocs.reverse(), ...prev]);
        if (createdDocs.length === 1) {
          setActiveDocId(createdDocs[0].id);
          setWorkspaceView('editor');
          setViewMode('split');
        } else {
          showNotice(`${createdDocs.length} فایل با حفظ ساختار پوشه‌ها به اسناد من اضافه شد.`);
        }
      }
    },
    [currentUser, selectedFolder, folders, showNotice]
  );

  const handleForkDocument = useCallback(
    async (doc: MarkdownDoc) => {
      if (!currentUser) {
        setIsAuthModalOpen(true);
        return;
      }
      try {
        const res = await cloudApi.publishFile({
          title: `کپی از ${doc.title}`,
          content: doc.content,
          description: doc.description || '',
          tags: doc.tags ? [...doc.tags] : [],
          visibility: 'private',
          is_public: false,
        });
        const forkedDoc = mapServerFileToDoc(res.file, currentUser.id);
        cloudSyncedStateRef.current[forkedDoc.id] = {
          title: forkedDoc.title,
          content: forkedDoc.content,
        };
        setDocuments((prev) => [forkedDoc, ...prev]);
        setActiveDocId(forkedDoc.id);
        setSharedViewDoc(null);
        clearShareUrlParam();
        setWorkspaceView('editor');
        setViewMode('split');
        showNotice('نسخه اختصاصی در اسناد شما ایجاد شد و آماده ویرایش است.');
      } catch (err: any) {
        showNotice(err.message || 'خطا در کپی کردن سند');
      }
    },
    [currentUser, showNotice]
  );

  const handleOpenExploreFile = useCallback(
    async (file: SharedMarkdownFile) => {
      try {
        const fullDoc = await cloudApi.getFileById(file.id);
        const mapped = mapServerFileToDoc(fullDoc, currentUser?.id);
        if (currentUser && mapped.isOwner) {
          setDocuments((prev) => {
            const exists = prev.find((d) => d.id === mapped.id);
            return exists ? prev.map((d) => (d.id === mapped.id ? mapped : d)) : [mapped, ...prev];
          });
          cloudSyncedStateRef.current[mapped.id] = { title: mapped.title, content: mapped.content };
          setActiveDocId(mapped.id);
          setSharedViewDoc(null);
          setWorkspaceView('editor');
          setViewMode('split');
        } else {
          setSharedViewDoc(mapped);
        }
      } catch (err: any) {
        showNotice(err.message || 'خطا در باز کردن سند');
      }
    },
    [currentUser, showNotice]
  );

  const handleForkExploreFile = useCallback(
    async (file: SharedMarkdownFile) => {
      try {
        const fullDoc = await cloudApi.getFileById(file.id);
        const mapped = mapServerFileToDoc(fullDoc, currentUser?.id);
        await handleForkDocument(mapped);
      } catch (err: any) {
        showNotice(err.message || 'خطا در کپی سند');
      }
    },
    [currentUser?.id, handleForkDocument, showNotice]
  );

  const handleOpenMyDocument = (file: SharedMarkdownFile) => {
    const mapped = mapServerFileToDoc(file, currentUser?.id);
    setDocuments((prev) => {
      const exists = prev.find((d) => d.id === mapped.id);
      return exists ? prev.map((d) => (d.id === mapped.id ? mapped : d)) : [mapped, ...prev];
    });
    cloudSyncedStateRef.current[mapped.id] = { title: mapped.title, content: mapped.content };
    setActiveDocId(mapped.id);
    setSharedViewDoc(null);
    setWorkspaceView('editor');
    setViewMode('split');
  };

  const handleOpenDocFromCommunity = useCallback(
    (doc: MarkdownDoc) => {
      if (currentUser && doc.userId === currentUser.id) {
        setDocuments((prev) => {
          const exists = prev.find((d) => d.id === doc.id);
          return exists ? prev.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...prev];
        });
        cloudSyncedStateRef.current[doc.id] = { title: doc.title, content: doc.content };
        setActiveDocId(doc.id);
        setSharedViewDoc(null);
        setWorkspaceView('editor');
        setViewMode('split');
      } else {
        setSharedViewDoc(doc);
      }
    },
    [currentUser]
  );

  const handleCopyShareLink = async () => {
    if (!activeDoc) return;
    if (activeDoc.visibility === 'private') {
      setShareTargetDocId(activeDoc.id);
      setIsShareModalOpen(true);
      showNotice('این سند خصوصی است؛ برای دریافت لینک، سطح دسترسی را روی «لینک مستقیم» یا «عمومی» قرار دهید.');
      return;
    }
    const url = buildShareUrl(activeDoc.id);
    const ok = await copyTextToClipboard(url);
    if (ok) {
      showNotice('لینک مستقیم اشتراک سند کپی شد.');
    } else {
      setShareTargetDocId(activeDoc.id);
      setIsShareModalOpen(true);
    }
  };

  const handleUpdateWordGoal = (newGoal: number | undefined) => {
    if (!activeDoc) return;
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === activeDocId ? { ...doc, wordGoal: newGoal, updatedAt: Date.now() } : doc
      )
    );
    if (newGoal) {
      showNotice(`هدف نگارش روی ${newGoal.toLocaleString('fa-IR')} کلمه تنظیم شد.`);
    } else {
      showNotice('هدف نگارش حذف شد.');
    }
  };

  // Update active document content
  const handleContentChange = useCallback(
    (newContent: string, pushToHistory = true) => {
      if (!activeDoc || sharedViewDoc) return;
      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === activeDocId ? { ...doc, content: newContent, updatedAt: Date.now() } : doc
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
    },
    [activeDoc, activeDocId, historyIndex, sharedViewDoc]
  );

  // Update active document title
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (!activeDoc || sharedViewDoc) return;
      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === activeDocId ? { ...doc, title: newTitle, updatedAt: Date.now() } : doc
        )
      );
    },
    [activeDoc, activeDocId, sharedViewDoc]
  );

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

  const handleToggleTask = useCallback(
    (taskIndex: number) => {
      if (!activeDoc || sharedViewDoc) return;
      const updated = toggleTaskInMarkdown(activeDoc.content, taskIndex);
      handleContentChange(updated, true);
    },
    [activeDoc, handleContentChange, sharedViewDoc]
  );

  const handleHighlightFromPreview = useCallback(
    (selectedText: string, color: HighlightColor) => {
      if (!activeDoc || sharedViewDoc || !selectedText.trim()) return;
      const trimmed = selectedText.trim();
      const currentContent = activeDoc.content;
      const tagPrefix = color === 'yellow' ? '==' : `==${color}:`;
      const tagSuffix = '==';
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const existingHighlightRegex = new RegExp(`==(?:[a-z]+:)?\\s*(${escapeRegex(trimmed)})\\s*==`, 'i');
      if (existingHighlightRegex.test(currentContent)) {
        handleContentChange(currentContent.replace(existingHighlightRegex, `${tagPrefix}$1${tagSuffix}`), true);
        return;
      }
      const exactIdx = currentContent.indexOf(trimmed);
      if (exactIdx !== -1) {
        handleContentChange(
          currentContent.slice(0, exactIdx) +
            `${tagPrefix}${trimmed}${tagSuffix}` +
            currentContent.slice(exactIdx + trimmed.length),
          true
        );
        return;
      }
      const words = trimmed.split(/\s+/).filter(Boolean).map(escapeRegex);
      if (words.length > 0) {
        const flexRegex = new RegExp(words.join('[\\s\\*\\_]+'));
        const match = flexRegex.exec(currentContent);
        if (match) {
          handleContentChange(
            currentContent.slice(0, match.index) +
              `${tagPrefix}${match[0]}${tagSuffix}` +
              currentContent.slice(match.index + match[0].length),
            true
          );
        }
      }
    },
    [activeDoc, handleContentChange, sharedViewDoc]
  );

  const handleRemoveHighlightFromPreview = useCallback(
    (highlightedText: string) => {
      if (!activeDoc || sharedViewDoc || !highlightedText.trim()) return;
      const trimmed = highlightedText.trim();
      const currentContent = activeDoc.content;
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const highlightRegex = new RegExp(`==(?:[a-z]+:)?\\s*(${escapeRegex(trimmed)})\\s*==`, 'i');
      if (highlightRegex.test(currentContent)) {
        handleContentChange(currentContent.replace(highlightRegex, '$1'), true);
      }
    },
    [activeDoc, handleContentChange, sharedViewDoc]
  );

  const handleAddTeacherNote = useCallback(
    (targetText: string, noteText: string) => {
      if (!activeDoc || sharedViewDoc || !noteText.trim()) return;
      const currentContent = activeDoc.content;
      const trimmedTarget = targetText.trim();
      const noteCallout = `\n\n> [!TIP]\n> **یادداشت:** ${noteText.trim()}\n\n`;

      if (trimmedTarget && currentContent.includes(trimmedTarget)) {
        const targetIndex = currentContent.indexOf(trimmedTarget);
        const nextNewline = currentContent.indexOf('\n', targetIndex);
        const insertAt = nextNewline !== -1 ? nextNewline : currentContent.length;
        handleContentChange(currentContent.slice(0, insertAt) + noteCallout + currentContent.slice(insertAt), true);
      } else {
        handleContentChange(currentContent + noteCallout, true);
      }
    },
    [activeDoc, handleContentChange, sharedViewDoc]
  );

  // Export handlers (Authenticated only)
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
    setTimeout(() => window.print(), 50);
  }, []);

  const handlePrintBooklet = useCallback((config: BookletConfig) => {
    setBookletConfig(config);
    setTimeout(() => window.print(), 150);
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    if (activeDoc) navigator.clipboard.writeText(activeDoc.content);
  }, [activeDoc]);

  const handleCopyHtml = useCallback(() => {
    navigator.clipboard.writeText(renderedHtml);
  }, [renderedHtml]);

  const handleSelectHeading = useCallback((id: string, line?: number) => {
    if (line && editorRef.current) editorRef.current.scrollToLine(line);
    const previewEl = previewScrollRef.current;
    if (previewEl) {
      const headingTarget = previewEl.querySelector(`#${id}`);
      if (headingTarget) headingTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Search & Replace handlers
  const handleSearch = useCallback(
    (query: string, matchCase: boolean) => {
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
    },
    [activeDoc]
  );

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

  const handleReplace = useCallback(
    (replaceWith: string) => {
      if (!activeDoc || searchMatches.length === 0) return;
      const matchIndex = searchMatches[currentMatchIndex];
      if (matchIndex === undefined) return;
      const textarea = editorRef.current?.getTextarea();
      const queryLen = textarea ? textarea.selectionEnd - textarea.selectionStart : 0;
      const newContent =
        activeDoc.content.substring(0, matchIndex) +
        replaceWith +
        activeDoc.content.substring(matchIndex + Math.max(1, queryLen));
      handleContentChange(newContent, true);
    },
    [activeDoc, searchMatches, currentMatchIndex, handleContentChange]
  );

  const handleReplaceAll = useCallback(
    (query: string, replaceWith: string, matchCase: boolean) => {
      if (!activeDoc || !query) return 0;
      const flags = matchCase ? 'g' : 'gi';
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, flags);
      const matchesCount = (activeDoc.content.match(regex) || []).length;
      const replaced = activeDoc.content.replace(regex, replaceWith);
      handleContentChange(replaced, true);
      setSearchMatches([]);
      return matchesCount;
    },
    [activeDoc, handleContentChange]
  );

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

  // Determine top-level render mode
  const isOAuthConsentRoute =
    typeof window !== 'undefined' && window.location.pathname === '/oauth/authorize';
  const isGuestMode = !currentUser && !sharedViewDoc && !sharedLinkError;
  const isReadOnlyShared = Boolean(sharedViewDoc);

  if (isAuthChecking || sharedLinkLoading) {
    return (
      <div className={`theme-${theme} flex flex-col items-center justify-center h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans gap-3`} dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-[var(--text-muted)]">در حال بارگذاری فضای کار...</p>
      </div>
    );
  }

  if (isOAuthConsentRoute) {
    return (
      <div className={`theme-${theme} min-h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans`}>
        <OAuthConsentView
          currentUser={currentUser}
          onAuthenticated={(user) => {
            setCurrentUser(user);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`theme-${theme} flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans`}>
      {/* Hidden Guest Local File Input */}
      <input
        ref={guestFileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        onChange={handleGuestFileChange}
        className="hidden"
      />

      {/* Top Navbar */}
      <Navbar
        title={
          isReadOnlyShared
            ? sharedViewDoc?.title || ''
            : isGuestMode
            ? guestDoc?.title || ''
            : activeDoc?.title || ''
        }
        onTitleChange={(newTitle) => {
          if (isGuestMode) {
            setGuestDoc((prev) => (prev ? { ...prev, title: newTitle } : null));
          } else {
            handleTitleChange(newTitle);
          }
        }}
        viewMode={isGuestMode ? guestViewMode : viewMode}
        onViewModeChange={(mode) => {
          if (isGuestMode) {
            if (mode !== 'presentation') setGuestViewMode(mode);
          } else {
            setViewMode(mode);
          }
        }}
        theme={theme}
        onThemeChange={setTheme}
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
        direction={textDirection}
        onDirectionChange={setTextDirection}
        onExportMarkdown={isGuestMode ? handleGuestExportMarkdown : handleExportMarkdown}
        onExportHtml={handleExportHtml}
        onPrint={handlePrint}
        onOpenBookletModal={() => setIsBookletModalOpen(true)}
        onOpenCommunity={() => setIsCommunityOpen(true)}
        onOpenShareModal={() => {
          setShareTargetDocId(activeDoc?.id || null);
          setIsShareModalOpen(true);
        }}
        isCloudShared={activeDoc?.isCloudShared}
        cloudSyncStatus={cloudSyncStatus}
        onManualSyncCloud={handleManualSyncCloud}
        onCopyShareLink={handleCopyShareLink}
        cloudFilesCount={exploreFilesCount}
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
        isGuestMode={isGuestMode}
        isDashboardView={Boolean(currentUser && workspaceView === 'dashboard' && !sharedViewDoc && !sharedLinkError)}
        isReadOnlyShared={isReadOnlyShared}
        onBackToDashboard={() => {
          setSharedViewDoc(null);
          setSharedLinkError(null);
          clearShareUrlParam();
          setWorkspaceView('dashboard');
        }}
        onGuestOpenLocalFile={() => guestFileInputRef.current?.click()}
        onOpenMcpBridge={currentUser ? () => setIsMcpBridgeOpen(true) : undefined}
      />

      {/* CASE 1: SHARED LINK ACCESS ERROR */}
      {sharedLinkError ? (
        <div className="flex-1 flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">
              دسترسی به این سند امکان‌پذیر نیست
            </h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">{sharedLinkError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ورود به حساب کاربری</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSharedLinkError(null);
                  clearShareUrlParam();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{currentUser ? 'بازگشت به داشبورد' : 'بازگشت به صفحه اصلی'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : isReadOnlyShared && sharedViewDoc ? (
        /* CASE 2: READ-ONLY SHARED LINK OR PUBLIC EXPLORE READER */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="no-print mx-4 mt-3 p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0" dir="rtl">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-[var(--text-primary)]">حالت مطالعه</span>
                <span className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-secondary)]">
                  نویسنده: <strong className="text-[var(--text-primary)]">{sharedViewDoc.cloudAuthor || 'کاربر'}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => handleForkDocument(sharedViewDoc)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>کپی به اسناد من و ویرایش</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>ورود برای کپی و ویرایش در اسناد من</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSharedViewDoc(null);
                  clearShareUrlParam();
                }}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-medium cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>

          <Preview
            scrollRef={previewScrollRef}
            html={renderedHtml}
            fontFamily={fontFamily}
            direction={effectiveDirection}
          />
        </div>
      ) : isGuestMode ? (
        /* CASE 3: GUEST LOCAL-ONLY MODE (Strictly opening, reading, editing, and saving a local file) */
        guestDoc === null ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsGuestDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsGuestDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsGuestDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                openLocalFileForGuest(e.dataTransfer.files[0]);
              }
            }}
            className="flex-1 flex items-center justify-center p-6 overflow-y-auto"
            dir="rtl"
          >
            <div
              className={`max-w-lg w-full rounded-3xl bg-[var(--bg-secondary)] border p-8 sm:p-10 text-center space-y-6 transition-colors ${
                isGuestDragging ? 'border-amber-500 bg-amber-500/5' : 'border-[var(--border-color)]'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h1 className="text-lg font-extrabold text-[var(--text-primary)]">
                  مطالعه و ویرایش فایل مارک‌دان محلی
                </h1>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  پیش از ورود به حساب کاربری، می‌توانید فایل <span dir="ltr" className="font-mono">.md</span> یا <span dir="ltr" className="font-mono">.txt</span> را از سیستم خود باز کرده، مطالعه یا ویرایش کنید و خروجی آن را ذخیره نمایید.
                </p>
              </div>

              <div
                onClick={() => guestFileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-color)] hover:border-amber-500/60 rounded-2xl p-6 cursor-pointer transition-colors space-y-2 bg-[var(--bg-primary)]/60"
              >
                <Upload className="w-6 h-6 text-amber-500 mx-auto" />
                <div className="text-xs font-semibold text-[var(--text-primary)]">
                  فایل را اینجا بکشید و رها کنید یا کلیک کنید
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  پشتیبانی از فایل‌های .md، .markdown و .txt (بدون ذخیره در پلتفرم)
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => guestFileInputRef.current?.click()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-500" />
                  <span>باز کردن فایل از سیستم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>ورود به فضای کار پلتفرم</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Guest Local File Reader / Editor */
          <main className="flex-1 flex overflow-hidden relative">
            {(guestViewMode === 'split' || guestViewMode === 'editor') && (
              <Editor
                ref={editorRef}
                value={guestDoc.content}
                onChange={(val) => setGuestDoc((prev) => (prev ? { ...prev, content: val } : null))}
                fontFamily={fontFamily}
                direction={effectiveDirection}
                showLineNumbers={true}
                onSave={handleGuestExportMarkdown}
              />
            )}

            {guestViewMode === 'split' && (
              <div className="w-[1px] bg-[var(--border-color)] shrink-0 select-none" />
            )}

            {(guestViewMode === 'split' || guestViewMode === 'preview') && (
              <Preview
                scrollRef={previewScrollRef}
                html={renderedHtml}
                fontFamily={fontFamily}
                direction={effectiveDirection}
              />
            )}
          </main>
        )
      ) : workspaceView === 'dashboard' && currentUser ? (
        /* CASE 4: AUTHENTICATED PERSONAL WORKSPACE DASHBOARD */
        <WorkspaceDashboard
          currentUser={currentUser}
          documents={documents}
          isLoadingDocs={isLoadingDocs}
          onCreateDoc={handleCreateDoc}
          onImportFiles={handleImportFiles}
          onOpenDoc={(docId, mode) => {
            setActiveDocId(docId);
            setViewMode(mode);
            setWorkspaceView('editor');
          }}
          onShareDoc={(docId) => {
            setActiveDocId(docId);
            setShareTargetDocId(docId);
            setIsShareModalOpen(true);
          }}
          onDeleteDoc={handleDeleteDoc}
          onToggleFavorite={handleToggleFavorite}
          onOpenExploreDoc={handleOpenExploreFile}
          onForkExploreDoc={handleForkExploreFile}
          exploreCountHint={exploreFilesCount}
          folders={folders}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onMoveDocToFolder={handleMoveDocToFolder}
          onOpenMcpBridge={() => setIsMcpBridgeOpen(true)}
        />
      ) : (
        /* CASE 5: AUTHENTICATED FULL EDITOR WORKSPACE */
        <>
          {viewMode !== 'preview' && (
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

          <div className="flex-1 flex overflow-hidden relative">
            <Sidebar
              documents={documents}
              activeDocId={activeDocId}
              onSelectDoc={(id) => {
                setActiveDocId(id);
                setWorkspaceView('editor');
              }}
              onCreateDoc={handleCreateDoc}
              onDeleteDoc={handleDeleteDoc}
              onDuplicateDoc={handleDuplicateDoc}
              onToggleFavorite={handleToggleFavorite}
              onImportFiles={handleImportFiles}
              isOpen={isSidebarOpen}
              onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
              onOpenCloudDoc={handleOpenDocFromCommunity}
              onOpenPublishModal={() => {
                setShareTargetDocId(activeDoc?.id || null);
                setIsShareModalOpen(true);
              }}
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
              onMoveDocToFolder={handleMoveDocToFolder}
            />

            <main className="flex-1 flex overflow-hidden relative">
              {!activeDoc ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3" dir="rtl">
                  <FileText className="w-10 h-10 text-[var(--text-muted)]" />
                  <p className="text-sm font-bold">هیچ سندی انتخاب نشده است</p>
                  <button
                    type="button"
                    onClick={() => setWorkspaceView('dashboard')}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs cursor-pointer"
                  >
                    بازگشت به داشبورد اسناد
                  </button>
                </div>
              ) : (
                <>
                  {(viewMode === 'split' || viewMode === 'editor') && (
                    <Editor
                      ref={editorRef}
                      value={activeDoc.content}
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

                  {viewMode === 'split' && (
                    <div className="w-[1px] bg-[var(--border-color)] shrink-0 select-none relative group">
                      <div className="absolute inset-y-0 -start-1 -end-1 cursor-col-resize hover:bg-amber-500/20" />
                    </div>
                  )}

                  {(viewMode === 'split' || viewMode === 'preview') && (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
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
                </>
              )}
            </main>

            <Outline
              headings={headings}
              isOpen={isOutlineOpen}
              onClose={() => setIsOutlineOpen(false)}
              onSelectHeading={handleSelectHeading}
            />
          </div>

          {activeDoc && (
            <StatsBar
              stats={stats}
              direction={effectiveDirection}
              cursorPos={cursorPos}
              selectionStats={selectionStats}
              wordGoal={activeDoc.wordGoal}
              onUpdateWordGoal={handleUpdateWordGoal}
              onGoalMet={() => setIsConfettiActive(true)}
              syncStatus={cloudSyncStatus}
            />
          )}
        </>
      )}

      {/* AUTHENTICATED MODALS ONLY */}
      {currentUser && (
        <>
          {isConfettiActive && (
            <ConfettiOverlay
              targetWords={activeDoc?.wordGoal}
              currentWords={stats.words}
              onClose={() => setIsConfettiActive(false)}
            />
          )}

          <CheatsheetModal
            isOpen={isCheatsheetOpen}
            onClose={() => setIsCheatsheetOpen(false)}
            onInsertExample={(text) => handleInsertMarkdown(text + '\n')}
          />

          <BookletModal
            isOpen={isBookletModalOpen}
            onClose={() => setIsBookletModalOpen(false)}
            documentTitle={activeDoc?.title || ''}
            onPrintBooklet={handlePrintBooklet}
          />

          <CommunityModal
            isOpen={isCommunityOpen}
            onClose={() => {
              setIsCommunityOpen(false);
              cloudApi
                .getHealth()
                .then((h) => {
                  if (h?.stats?.totalFiles !== undefined) {
                    setExploreFilesCount(h.stats.totalFiles);
                  }
                })
                .catch(() => {});
            }}
            onOpenFileInEditor={handleOpenDocFromCommunity}
            onOpenPublishModal={() => {
              setShareTargetDocId(activeDoc?.id || null);
              setIsShareModalOpen(true);
            }}
            currentUserId={currentUser.id}
          />

          <SharePublishModal
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setShareTargetDocId(null);
            }}
            documentId={shareTargetDoc?.id}
            isExistingCloudDoc={Boolean(shareTargetDoc?.isCloudShared && shareTargetDoc?.isOwner)}
            documentTitle={shareTargetDoc?.title || ''}
            documentContent={shareTargetDoc?.content || ''}
            initialDescription={shareTargetDoc?.description || ''}
            initialTags={shareTargetDoc?.tags || []}
            initialVisibility={shareTargetDoc?.visibility || 'private'}
            defaultAuthor={currentUser.displayName}
            onPublishedSuccess={(shareId, meta) => {
              const targetId = shareTargetDoc?.id || shareId;
              setDocuments((prev) =>
                prev.map((d) =>
                  d.id === targetId
                    ? {
                        ...d,
                        id: shareId,
                        title: meta.title,
                        description: meta.description,
                        tags: meta.tags,
                        visibility: meta.visibility,
                        isCloudShared: true,
                        isOwner: true,
                        cloudSyncedAt: Date.now(),
                      }
                    : d
                )
              );
              cloudApi
                .getHealth()
                .then((h) => {
                  if (h?.stats?.totalFiles !== undefined) {
                    setExploreFilesCount(h.stats.totalFiles);
                  }
                })
                .catch(() => {});
              showNotice('تنظیمات دسترسی سند با موفقیت ذخیره شد.');
            }}
            onOpenCommunity={() => setIsCommunityOpen(true)}
          />

          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={currentUser}
            onUserUpdated={(updatedUser) => {
              setCurrentUser(updatedUser);
              setDocuments((prev) =>
                prev.map((d) =>
                  d.isOwner ? { ...d, cloudAuthor: updatedUser.displayName } : d
                )
              );
            }}
            onLogout={handleLogout}
          />

          <MyDocumentsModal
            isOpen={isMyDocumentsModalOpen}
            onClose={() => setIsMyDocumentsModalOpen(false)}
            onOpenDocument={handleOpenMyDocument}
            userName={currentUser.displayName}
          />

          <McpBridgeModal
            isOpen={isMcpBridgeOpen}
            onClose={() => setIsMcpBridgeOpen(false)}
            onVaultSynced={async () => {
              if (currentUser) {
                await loadUserDocuments(currentUser);
              }
            }}
          />

          {viewMode === 'presentation' && activeDoc && workspaceView === 'editor' && (
            <PresentationView
              markdown={activeDoc.content}
              title={activeDoc.title}
              fontFamily={fontFamily}
              direction={effectiveDirection}
              onExit={() => setViewMode('preview')}
              onToggleTask={handleToggleTask}
            />
          )}

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
                      <strong>مؤلف:</strong> {bookletConfig.authorName || currentUser.displayName}
                    </div>
                    {bookletConfig.showDate && (
                      <div>
                        <strong>تاریخ:</strong> {new Date().toLocaleDateString('fa-IR')}
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
        </>
      )}

      {/* User Authentication Modal (Accessible in Guest / Shared modes) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed bottom-12 start-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-emerald-500/40 text-emerald-400 px-4 py-2.5 rounded-2xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}
    </div>
  );
}
