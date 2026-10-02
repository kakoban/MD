import { authApi } from './authApi';

export interface SharedMarkdownFile {
  id: string;
  title: string;
  content?: string;
  description: string;
  author_name: string;
  author_username?: string;
  user_id?: string;
  tags: string[];
  is_public: boolean;
  views_count: number;
  stars_count: number;
  created_at: string;
  updated_at: string;
  content_length?: number;
  my_access_status?: 'pending' | 'approved' | 'rejected' | null;
  isLocked?: boolean;
}

export interface DocumentAccessRequest {
  id: string;
  file_id: string;
  requester_id: string;
  owner_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  file_title?: string;
  file_description?: string;
  requester_name?: string;
  requester_username?: string;
  requester_avatar?: string;
  requester_email?: string;
  owner_name?: string;
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

async function safeJson<T = any>(res: Response, fallbackError = 'خطای ارتباط با سرور'): Promise<T> {
  const text = await res.text();
  if (text && text.trim().startsWith('{')) {
    const data = JSON.parse(text);
    if (!res.ok) {
      const err: any = new Error(data.error || fallbackError);
      Object.assign(err, data);
      throw err;
    }
    return data;
  }
  if (!res.ok) {
    throw new Error(fallbackError);
  }
  return {} as T;
}

export const cloudApi = {
  // Check health and get stats
  async getHealth() {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return { status: 'offline' };
      const text = await res.text();
      if (text && text.trim().startsWith('{')) {
        return JSON.parse(text);
      }
    } catch {}
    return { status: 'offline' };
  },

  // Fetch community files
  async getFiles(params?: {
    search?: string;
    tag?: string;
    sort?: 'recent' | 'popular' | 'views';
    limit?: number;
    offset?: number;
  }): Promise<FilesResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.tag) searchParams.set('tag', params.tag);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));

      const res = await fetch(`/api/files?${searchParams.toString()}`, {
        headers: authApi.getAuthHeaders(),
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{')) {
          return JSON.parse(text);
        }
      }
    } catch (e) {
      console.warn('Cloud files fetch offline/fallback', e);
    }
    return { files: [], tags: [] };
  },

  // Fetch single file by ID
  async getFileById(id: string): Promise<SharedMarkdownFile> {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      headers: authApi.getAuthHeaders(),
    });
    return safeJson<SharedMarkdownFile>(res, 'خطا در بارگذاری فایل از دیتابیس');
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
    return safeJson(res, 'خطا در انتشار فایل در پایگاه داده');
  },

  // Update existing file
  async updateFile(id: string, payload: Partial<PublishPayload>) {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return safeJson(res, 'خطا در به‌روزرسانی فایل');
  },

  // Delete file
  async deleteFile(id: string) {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authApi.getAuthHeaders(),
    });
    return safeJson(res, 'خطا در حذف فایل');
  },

  // Star / like a file
  async starFile(id: string): Promise<{ stars: number }> {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}/star`, {
      method: 'POST',
    });
    return safeJson(res, 'خطا در ثبت امتیاز');
  },

  // Request access to a private file
  async requestFileAccess(fileId: string, message?: string): Promise<{ success: boolean; message: string; request: DocumentAccessRequest }> {
    const res = await fetch(`/api/files/${encodeURIComponent(fileId)}/request-access`, {
      method: 'POST',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify({ message }),
    });
    return safeJson(res, 'خطا در ارسال درخواست دسترسی');
  },

  // Get incoming requests for current user's documents
  async getIncomingAccessRequests(): Promise<{ requests: DocumentAccessRequest[] }> {
    try {
      const res = await fetch('/api/access-requests/incoming', {
        headers: authApi.getAuthHeaders(),
      });
      return safeJson(res, 'خطا در دریافت درخواست‌های ورودی');
    } catch {
      return { requests: [] };
    }
  },

  // Respond to access request (approve / reject)
  async respondToAccessRequest(requestId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/access-requests/${encodeURIComponent(requestId)}/respond`, {
      method: 'POST',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return safeJson(res, 'خطا در ثبت پاسخ درخواست');
  },

  // Get outgoing requests sent by current user
  async getOutgoingAccessRequests(): Promise<{ requests: DocumentAccessRequest[] }> {
    try {
      const res = await fetch('/api/access-requests/outgoing', {
        headers: authApi.getAuthHeaders(),
      });
      return safeJson(res, 'خطا در دریافت وضعیت درخواست‌ها');
    } catch {
      return { requests: [] };
    }
  },
};
