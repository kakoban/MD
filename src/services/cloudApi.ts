import { authApi } from './authApi';
import { DocVisibility } from '../types';

export interface SharedMarkdownFile {
  id: string;
  title: string;
  content?: string;
  description: string;
  author_name: string;
  user_id?: string;
  tags: string[];
  visibility?: DocVisibility;
  is_public: boolean;
  is_favorite?: boolean;
  is_owner?: boolean;
  views_count: number;
  stars_count: number;
  created_at: string;
  updated_at: string;
  content_length?: number;
}

export interface CommunityTag {
  tag: string;
  count: number;
}

export interface FilesResponse {
  files: SharedMarkdownFile[];
  tags: CommunityTag[];
}

export interface PublishPayload {
  title: string;
  content: string;
  description?: string;
  author_name?: string;
  tags?: string[];
  visibility?: DocVisibility;
  is_public?: boolean;
  is_favorite?: boolean;
  customId?: string;
}

export const cloudApi = {
  // Check health and get stats
  async getHealth() {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('خطا در برقراری ارتباط با سرور');
    return res.json();
  },

  // Fetch public explore files
  async getFiles(params?: {
    search?: string;
    tag?: string;
    sort?: 'recent' | 'popular' | 'views';
    limit?: number;
    offset?: number;
  }): Promise<FilesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const res = await fetch(`/api/files?${searchParams.toString()}`);
    if (!res.ok) {
      throw new Error('خطا در دریافت لیست اسناد عمومی');
    }
    return res.json();
  },

  // Fetch single file by ID (sends auth header if logged in so owner can open private docs)
  async getFileById(id: string): Promise<SharedMarkdownFile> {
    const token = authApi.getToken();
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      if (res.status === 404) throw new Error(errData?.error || 'سند مورد نظر یافت نشد.');
      if (res.status === 403) throw new Error(errData?.error || 'این سند خصوصی است و دسترسی به آن مجاز نیست.');
      throw new Error(errData?.error || 'خطا در بارگذاری سند');
    }
    return res.json();
  },

  // Create / save a new markdown file
  async publishFile(payload: PublishPayload): Promise<{
    success: boolean;
    file: SharedMarkdownFile;
    shareUrl: string;
  }> {
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ذخیره‌سازی سند');
    }
    return data;
  },

  // Update existing file
  async updateFile(id: string, payload: Partial<PublishPayload>) {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در به‌روزرسانی سند');
    }
    return data;
  },

  // Delete file
  async deleteFile(id: string) {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authApi.getAuthHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'خطا در حذف سند');
    }
    return res.json();
  },

  // Star / like a public file
  async starFile(id: string): Promise<{ stars: number }> {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}/star`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('خطا در ثبت امتیاز');
    return res.json();
  },
};
