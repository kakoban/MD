export interface MarkdownDoc {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  isFavorite?: boolean;
  tags?: string[];
  isCloudShared?: boolean;
  cloudSyncedAt?: number;
  cloudAuthor?: string;
  isForked?: boolean;
  wordGoal?: number;
}

export type ViewMode = 'split' | 'editor' | 'preview' | 'presentation';

export type AppTheme = 'dark' | 'light' | 'sepia' | 'cyber' | 'nord' | 'academic' | 'editorial';

export type FontFamily = 'vazir' | 'sans' | 'serif' | 'mono';

export type TextDirection = 'auto' | 'rtl' | 'ltr';

export type CloudSyncStatus = 'synced' | 'saving' | 'pending' | 'error';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export interface BookletConfig {
  includeCover: boolean;
  authorName: string;
  subtitle: string;
  institution: string;
  watermark: string;
  showPageNumbers: boolean;
  showDate: boolean;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
  line?: number;
}

export interface DocStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  lines: number;
  readingTimeMin: number;
  headingsCount: number;
  tasksCount: {
    total: number;
    completed: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
  message?: string;
}
