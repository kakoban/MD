import { authApi } from './authApi';

export interface SharedMarkdownFile {
  id: string;
  title: string;
  content?: string;
  description: string;
  author_name: string;
  user_id?: string;
  tags: string[];
  is_public: boolean;
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
  is_public?: boolean;
  customId?: string;
}

export const cloudApi = {
  // Check health and get stats
  async getHealth() {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Failed to connect to database');
    return res.json();
  },

  // Fetch community files
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
      throw new Error('خطا در دریافت لیست فایل‌ها از دیتابیس');
    }
    return res.json();
  },

  // Fetch single file by ID
  async getFileById(id: string): Promise<SharedMarkdownFile> {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error('فایل مورد نظر در دیتابیس یافت نشد.');
      throw new Error('خطا در بارگذاری فایل از دیتابیس');
    }
    return res.json();
  },

  // Publish / Upload a new markdown file
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
      throw new Error(data.error || 'خطا در انتشار فایل در پایگاه داده');
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
      throw new Error(data.error || 'خطا در به‌روزرسانی فایل');
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
      throw new Error(data.error || 'خطا در حذف فایل');
    }
    return res.json();
  },

  // Star / like a file
  async starFile(id: string): Promise<{ stars: number }> {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}/star`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('خطا در ثبت امتیاز');
    return res.json();
  },
};
