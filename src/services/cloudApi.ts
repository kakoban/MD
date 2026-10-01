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

    const res = await fetch(`/api/files?${searchParams.toString()}`, {
      headers: authApi.getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error('خطا در دریافت لیست فایل‌ها از دیتابیس');
    }
    return res.json();
  },

  // Fetch single file by ID
  async getFileById(id: string): Promise<SharedMarkdownFile> {
    const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403 && data.isLocked) {
        const err: any = new Error(data.error || 'این سند خصوصی است و نیاز به مجوز دارد.');
        err.isLocked = true;
        err.requiresAuth = data.requiresAuth;
        err.accessStatus = data.accessStatus;
        err.file = data.file;
        throw err;
      }
      if (res.status === 404) throw new Error('فایل مورد نظر در دیتابیس یافت نشد.');
      throw new Error(data.error || 'خطا در بارگذاری فایل از دیتابیس');
    }
    return data;
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

  // Request access to a private file
  async requestFileAccess(fileId: string, message?: string): Promise<{ success: boolean; message: string; request: DocumentAccessRequest }> {
    const res = await fetch(`/api/files/${encodeURIComponent(fileId)}/request-access`, {
      method: 'POST',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ارسال درخواست دسترسی');
    }
    return data;
  },

  // Get incoming requests for current user's documents
  async getIncomingAccessRequests(): Promise<{ requests: DocumentAccessRequest[] }> {
    const res = await fetch('/api/access-requests/incoming', {
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت درخواست‌های ورودی');
    }
    return data;
  },

  // Respond to access request (approve / reject)
  async respondToAccessRequest(requestId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/access-requests/${encodeURIComponent(requestId)}/respond`, {
      method: 'POST',
      headers: authApi.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ثبت پاسخ درخواست');
    }
    return data;
  },

  // Get outgoing requests sent by current user
  async getOutgoingAccessRequests(): Promise<{ requests: DocumentAccessRequest[] }> {
    const res = await fetch('/api/access-requests/outgoing', {
      headers: authApi.getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در دریافت وضعیت درخواست‌ها');
    }
    return data;
  },
};
