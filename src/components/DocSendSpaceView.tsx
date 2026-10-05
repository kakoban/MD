import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  MoreVertical,
  Share2,
  Eye,
  Plus,
  Folder,
  FolderPlus,
  Trash2,
  Upload,
  FileText,
  Sparkles,
  ArrowUp,
  Check,
  Lock,
  Unlock,
  ShieldCheck,
  Image as ImageIcon,
  Copy,
  Info,
  Search,
  ExternalLink,
  Users,
  Settings,
  HelpCircle,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { MarkdownDoc, UserProfile } from '../types';
import { SharedMarkdownFile, cloudApi } from '../services/cloudApi';
import { useLanguage } from '../context/LanguageContext';

interface DocSendSpaceViewProps {
  documents: MarkdownDoc[];
  currentUser: UserProfile | null;
  onOpenDoc: (docId: string, mode?: 'split' | 'editor' | 'preview') => void;
  onCreateDoc: () => void;
  onOpenCloudDoc: (file: SharedMarkdownFile) => void;
  onImportFiles: (files: FileList) => void;
  onOpenTemplates: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onOpenAccessRequestsManager?: () => void;
  pendingRequestsCount?: number;
}

export const DocSendSpaceView: React.FC<DocSendSpaceViewProps> = ({
  documents,
  currentUser,
  onOpenDoc,
  onCreateDoc,
  onOpenCloudDoc,
  onImportFiles,
  onOpenTemplates,
  onOpenProfile,
  onOpenAuth,
  onOpenAccessRequestsManager,
  pendingRequestsCount = 0,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'home' | 'permissions' | 'diligence' | 'qa' | 'analytics' | 'audit' | 'trash'
  >('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [promptInput, setPromptInput] = useState('');
  const [cloudFiles, setCloudFiles] = useState<SharedMarkdownFile[]>([]);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [spaceTitle, setSpaceTitle] = useState(
    currentUser?.displayName
      ? `${currentUser.displayName}'s Space`
      : 'Project Beacon'
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [requestFilesOpen, setRequestFilesOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [spaceStatus, setSpaceStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCloud = useCallback(async () => {
    setIsCloudLoading(true);
    try {
      const res = await cloudApi.getFiles({ limit: 50 });
      setCloudFiles(res.files || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCloudLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCloud();
  }, [fetchCloud]);

  const handleCopyLink = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/?share=${fileId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareSpace = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedId('space-url');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportFiles(e.dataTransfer.files);
    }
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) {
      onCreateDoc();
      return;
    }
    onCreateDoc();
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="flex-1 flex flex-col h-full w-full overflow-hidden bg-white text-[#111827] font-sans antialiased"
      dir="ltr"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => e.target.files && onImportFiles(e.target.files)}
      />

      {/* Top Global Header Bar */}
      <header className="h-12 border-b border-[#e5e7eb] px-4 flex items-center justify-between bg-white shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-[#0061ff] flex items-center justify-center text-white font-black text-xs shadow-xs">
              M
            </div>
            <span className="font-extrabold text-sm tracking-tight text-[#111827]">Markdown Studio</span>
          </div>

          <span className="text-[#d1d5db] font-light">|</span>

          <span className="text-xs font-semibold text-[#4b5563]">Virtual Data Room</span>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md mx-6 relative hidden sm:block">
          <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, files, or spaces..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg text-xs text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#0061ff] focus:bg-white transition-colors"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1 bg-[#a3e635] hover:bg-[#84cc16] text-[#111827] font-bold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-[#111827]" />
            <span>Upgrade</span>
          </button>

          <button
            type="button"
            onClick={onOpenTemplates}
            className="text-[#6b7280] hover:text-[#111827] p-1 transition-colors"
            title="Help / Templates"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-[#f3f4f6] transition-colors cursor-pointer"
            >
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-[#111827] leading-none">
                  {currentUser.displayName || currentUser.username}
                </div>
                <div className="text-[10px] text-[#6b7280] font-medium leading-none mt-0.5">
                  Advanced Data Rooms
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#111827] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'U'}
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0061ff] hover:bg-[#0050d4] text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body: Sidebar + Space Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR (DocSend Exact Layout) */}
        <aside className="w-56 shrink-0 bg-white border-r border-[#e5e7eb] flex flex-col justify-between select-none overflow-y-auto">
          <div className="py-4">
            {/* Top link: < All Spaces */}
            <div className="px-4 mb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('home');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#374151] hover:text-[#0061ff] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>All Spaces</span>
              </button>
            </div>

            {/* Space Title in Sidebar */}
            <div className="px-4 mb-4">
              <h2 className="text-xs font-bold text-[#111827] truncate">
                {spaceTitle}
              </h2>
            </div>

            {/* Space Submenu */}
            <nav className="space-y-0.5 px-2">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'home'
                    ? 'bg-[#f3f4f6] text-[#111827] font-bold'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                }`}
              >
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('permissions')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'permissions'
                    ? 'bg-[#f3f4f6] text-[#111827] font-bold'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                }`}
              >
                <span>Permissions</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#f59e0b] text-neutral-950 font-black text-[9px]">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diligence')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'diligence'
                    ? 'bg-[#f3f4f6] text-[#111827] font-bold'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                }`}
              >
                <span>Diligence tracker</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qa')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'qa'
                    ? 'bg-[#f3f4f6] text-[#111827] font-bold'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                }`}
              >
                <span>Q&A</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-[#f3f4f6] text-[#111827] font-bold'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                }`}
              >
                <span>Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'audit'
                    ? 'bg-[#f3f4f6] text-[#111827] font-bold'
                    : 'text-[#4b5563] hover:bg-[#f9fafb] hover:text-[#111827]'
                }`}
              >
                <span>Audit log</span>
              </button>
            </nav>

            <div className="my-4 border-t border-[#e5e7eb]" />

            {/* Space folders */}
            <div className="px-4 mb-2">
              <span className="text-[11px] font-semibold text-[#6b7280]">Space folders</span>
            </div>

            <div className="space-y-0.5 px-2">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                <Folder className="w-4 h-4 text-[#60a5fa] fill-[#93c5fd]" />
                <span className="font-medium">Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trash')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  activeTab === 'trash' ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#6b7280] hover:bg-[#f9fafb]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 text-[#93c5fd] fill-[#bfdbfe]" />
                  <span>Trash</span>
                </div>
                <Info className="w-3.5 h-3.5 text-[#9ca3af]" />
              </button>
            </div>
          </div>

          {/* Bottom Sidebar Link */}
          <div className="p-3 border-t border-[#e5e7eb]">
            <button
              type="button"
              onClick={onOpenTemplates}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#4b5563] hover:text-[#111827] rounded-lg hover:bg-[#f9fafb] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[#6b7280]" />
              <span>Shared with me</span>
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN SPACE CONTENT AREA (Exact DocSend Replica) */}
        <main
          className="flex-1 overflow-y-auto bg-white flex flex-col relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {/* 1. Green Abstract Banner */}
          <div className="h-44 md:h-56 w-full relative bg-[#709c6c] overflow-hidden shrink-0">
            {/* Organic SVG Shapes in Banner */}
            <svg
              className="absolute inset-0 w-full h-full object-cover"
              viewBox="0 0 1200 240"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M-50,0 C300,180 700,40 1250,160 L1250,240 L-50,240 Z"
                fill="#5b8657"
                opacity="0.85"
              />
              <path
                d="M100,0 C450,260 850,20 1300,90 L1300,0 Z"
                fill="#82ad7d"
                opacity="0.6"
              />
              <path
                d="M600,-40 C850,150 1100,60 1350,220 L1350,0 Z"
                fill="#94be8f"
                opacity="0.5"
              />
            </svg>
          </div>

          {/* 2. Space Header Info Card (Overlapping Banner) */}
          <div className="max-w-6xl w-full mx-auto px-6 -mt-16 relative z-10 space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-end gap-5">
                {/* Logo Image Placeholder Box (White square with icon) */}
                <div
                  onClick={onOpenProfile}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white border border-[#e5e7eb] shadow-md flex items-center justify-center text-[#9ca3af] hover:text-[#4b5563] hover:border-[#d1d5db] transition-all cursor-pointer shrink-0 bg-white"
                  title="Click to edit space logo / profile"
                >
                  <ImageIcon className="w-9 h-9 stroke-[1.5]" />
                </div>

                {/* Space Meta */}
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    {isEditingTitle ? (
                      <input
                        type="text"
                        value={spaceTitle}
                        autoFocus
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                        onChange={(e) => setSpaceTitle(e.target.value)}
                        className="text-2xl font-bold text-[#111827] border-b border-[#0061ff] outline-none"
                      />
                    ) : (
                      <h1
                        onClick={() => setIsEditingTitle(true)}
                        className="text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight hover:text-[#0061ff] cursor-pointer"
                        title="Click to rename Space"
                      >
                        {spaceTitle}
                      </h1>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#6b7280] font-medium mt-1">
                    <span>Subtitle</span>
                    <span>·</span>
                    <span>Last updated Just now</span>
                    <span>·</span>

                    {/* Status Pill dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] font-bold text-[11px] cursor-pointer"
                      >
                        <span>{spaceStatus}</span>
                        <ChevronDown className="w-3 h-3 text-[#065f46]" />
                      </button>

                      {statusDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-28 bg-white border border-[#e5e7eb] rounded-lg shadow-lg py-1 z-40 text-xs">
                          {(['Active', 'Draft', 'Archived'] as const).map((st) => (
                            <button
                              key={st}
                              onClick={() => {
                                setSpaceStatus(st);
                                setStatusDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] text-[#374151]"
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collaborator Avatars & + Button */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#1e293b] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      {currentUser?.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'Z'}
                    </div>
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="w-6 h-6 rounded-full border border-dashed border-[#9ca3af] hover:border-[#4b5563] text-[#4b5563] hover:text-[#111827] flex items-center justify-center text-xs transition-colors"
                      title="Invite collaborators"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Top-Right Space Actions: Preview / Share */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="p-2 rounded-lg hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#111827] transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (documents[0]) onOpenDoc(documents[0].id, 'preview');
                  }}
                  className="px-4 py-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#374151] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Preview
                </button>

                <button
                  type="button"
                  onClick={handleShareSpace}
                  className="flex items-center gap-1.5 px-5 py-2 bg-[#111827] hover:bg-black text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {copiedId === 'space-url' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#34d399]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <span>Share</span>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Section Toolbar: Home + Actions (Request files / Create folder / Add content) */}
            <div className="pt-4 border-t border-[#e5e7eb] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#111827]">Home</h2>

              <div className="flex items-center gap-2">
                {/* Request files */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRequestFilesOpen(!requestFilesOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] font-semibold text-xs rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                    </svg>
                    <span>Request files</span>
                    <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
                  </button>

                  {requestFilesOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-[#e5e7eb] rounded-lg shadow-lg py-1 z-40 text-xs">
                      <button
                        onClick={() => {
                          setRequestFilesOpen(false);
                          if (documents[0]) onOpenDoc(documents[0].id, 'split');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#f3f4f6] text-[#374151]"
                      >
                        Create upload link
                      </button>
                    </div>
                  )}
                </div>

                {/* Create folder */}
                <button
                  type="button"
                  onClick={onCreateDoc}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#374151] font-semibold text-xs rounded-lg transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#6b7280]" />
                  <span>Create folder</span>
                </button>

                {/* Add content dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddContentOpen(!addContentOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#111827] font-bold text-xs rounded-lg transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#111827]" />
                    <span>Add content</span>
                    <ChevronDown className="w-3 h-3 text-[#6b7280]" />
                  </button>

                  {addContentOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-[#e5e7eb] rounded-xl shadow-xl py-1.5 z-40 text-xs">
                      <button
                        onClick={() => {
                          setAddContentOpen(false);
                          onCreateDoc();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f3f4f6] text-[#111827] font-medium"
                      >
                        <FileText className="w-4 h-4 text-[#0061ff]" />
                        <span>New Markdown Document</span>
                      </button>
                      <button
                        onClick={() => {
                          setAddContentOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f3f4f6] text-[#111827] font-medium"
                      >
                        <Upload className="w-4 h-4 text-[#10b981]" />
                        <span>Upload .md file</span>
                      </button>
                      <button
                        onClick={() => {
                          setAddContentOpen(false);
                          onOpenTemplates();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f3f4f6] text-[#111827] font-medium"
                      >
                        <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                        <span>From Template</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Dashed Upload & Prompt Container (Exact DocSend Center Card) */}
            <div
              className="w-full border border-dashed border-[#cbd5e1] rounded-2xl p-10 flex flex-col items-center justify-center bg-white text-center relative"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              {/* Floating Card: "✦ What are you building?" */}
              <div className="max-w-md w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col items-center space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0f172a]">
                  <Sparkles className="w-4 h-4 text-[#0061ff] fill-[#0061ff]" />
                  <span>What are you building?</span>
                </div>

                {/* Input with arrow send button */}
                <form onSubmit={handlePromptSubmit} className="w-full relative">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Sharing pitch deck and financials with investors"
                    className="w-full pl-4 pr-11 py-2.5 bg-white border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0061ff] transition-all shadow-xs"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#94a3b8] hover:bg-[#0061ff] text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </form>

                {/* Import folder dropdown links */}
                <div className="flex items-center gap-2 text-[11px] text-[#64748b] flex-wrap justify-center">
                  <span>Or import a folder structure from:</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('permissions')}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#334155] font-semibold"
                  >
                    <span>Another Space</span>
                    <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded-md bg-white border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#334155] font-semibold"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={onOpenTemplates}
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-white border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#334155] font-semibold"
                  >
                    <span>Template</span>
                    <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
                  </button>
                </div>
              </div>

              {/* Subtle drop text at bottom */}
              <p className="text-xs text-[#94a3b8] mt-6 font-medium">
                Drop files here to upload
              </p>
            </div>

            {/* 5. Document List Section */}
            {activeTab === 'home' && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-[#f1f5f9] bg-[#f8fafc] flex items-center justify-between text-xs font-bold text-[#64748b]">
                  <span>NAME ({filteredDocs.length})</span>
                  <span>ACTIONS</span>
                </div>

                <div className="divide-y divide-[#f1f5f9]">
                  {filteredDocs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#94a3b8]">
                      No documents found. Start writing above or drop a .md file!
                    </div>
                  ) : (
                    filteredDocs.map((doc) => {
                      const updatedDate = new Date(doc.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <div
                          key={doc.id}
                          onClick={() => onOpenDoc(doc.id, 'split')}
                          className="px-5 py-3.5 hover:bg-[#f8fafc] transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#eff6ff] text-[#0061ff] flex items-center justify-center shrink-0 border border-[#dbeafe]">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#111827] group-hover:text-[#0061ff] transition-colors truncate">
                                  {doc.title || 'Untitled Document'}
                                </span>
                                {doc.isCloudShared && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ecfdf5] text-[#059669] font-bold border border-[#a7f3d0]">
                                    Cloud
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#9ca3af] block mt-0.5 truncate">
                                Updated {updatedDate}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {doc.isCloudShared ? (
                              <button
                                type="button"
                                onClick={(e) => handleCopyLink(doc.id, e)}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0061ff] hover:bg-[#eff6ff] rounded-md transition-colors border border-[#dbeafe]"
                                title="کپی لینک مستقیم این سند برای ارسال به دیگران"
                              >
                                {copiedId === doc.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-bold">کپی شد!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>کپی لینک</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDoc(doc.id, 'split');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-[#6b7280] hover:text-[#0061ff] hover:bg-[#f3f4f6] rounded-md transition-colors"
                                title="برای اشتراک‌گذاری، این سند را منتشر کنید"
                              >
                                انتشار سند
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDoc(doc.id, 'preview');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-[#4b5563] hover:text-[#111827] hover:bg-[#f3f4f6] rounded-md transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDoc(doc.id, 'split');
                              }}
                              className="px-3 py-1 bg-[#0061ff] hover:bg-[#0050d4] text-white font-bold text-xs rounded-md shadow-xs transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 6. Permissions Matrix Section */}
            {activeTab === 'permissions' && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-xs">
                <div className="p-5 border-b border-[#f1f5f9] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[#111827]">
                      Permissions & Access Control Matrix
                    </h3>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      Configure public viewing, require approval, and manage file access
                    </p>
                  </div>
                  {onOpenAccessRequestsManager && (
                    <button
                      type="button"
                      onClick={onOpenAccessRequestsManager}
                      className="px-3 py-1.5 bg-[#0061ff] text-white font-bold text-xs rounded-lg shadow-xs"
                    >
                      <span>Review Requests</span>
                      {pendingRequestsCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-[#f59e0b] text-neutral-950 rounded-full font-black text-[10px]">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#f1f5f9] bg-[#f8fafc] text-[#64748b] font-bold">
                        <th className="py-3 px-4">DOCUMENT</th>
                        <th className="py-3 px-4 text-center">ACCESS LEVEL</th>
                        <th className="py-3 px-4 text-center">PUBLIC VIEW</th>
                        <th className="py-3 px-4 text-center">REQUIRE APPROVAL</th>
                        <th className="py-3 px-4 text-center">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9] font-medium">
                      {cloudFiles.slice(0, 15).map((file) => (
                        <tr key={file.id} className="hover:bg-[#f8fafc] transition-colors">
                          <td className="py-3 px-4 max-w-xs truncate">
                            <span className="font-bold text-[#111827] block truncate">{file.title}</span>
                            <span className="text-[10px] text-[#9ca3af] font-mono">@{file.author_username || 'author'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {file.is_public ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#065f46] font-bold text-[10px] border border-[#a7f3d0]">
                                Public
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#991b1b] font-bold text-[10px] border border-[#fecaca]">
                                Confidential
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {file.is_public ? <Check className="w-4 h-4 text-[#059669] mx-auto" /> : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {!file.is_public ? <Lock className="w-4 h-4 text-[#d97706] mx-auto" /> : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onOpenCloudDoc(file)}
                              className="px-2.5 py-1 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#111827] font-semibold text-xs rounded-md"
                            >
                              {file.is_public ? 'Open' : 'Request Access'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. Q&A / Comments Section */}
            {activeTab === 'qa' && (
              <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                  <div>
                    <h3 className="font-bold text-sm text-[#111827] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#0061ff]" />
                      <span>پرسش و پاسخ و نظرات اسناد (Q&A & Discussion)</span>
                    </h3>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      مشاهده نظرات، سوالات و تعامل روی اسناد منتشرشده
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#f1f5f9]">
                  {cloudFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => onOpenCloudDoc(file)}
                      className="py-3 px-4 hover:bg-[#f8fafc] rounded-xl flex items-center justify-between cursor-pointer group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-[#111827] group-hover:text-[#0061ff] transition-colors">
                            {file.title}
                          </span>
                          <span className="text-[11px] text-[#9ca3af] block">
                            نویسنده: {file.author_name}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCloudDoc(file);
                        }}
                        className="px-3 py-1.5 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#111827] font-semibold text-xs rounded-lg"
                      >
                        مشاهده و ثبت نظر
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
