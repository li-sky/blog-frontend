import { AuthResponse, Comment, CommentListResponse, InitAdminRequest, LoginRequest, Post, PostListResponse, PostPayload, RegisterRequest, User, Setting, SettingsResponse, UpdateSettingRequest } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/#/login';
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API Request Failed');
  }
  if (response.status === 204) return null;
  return response.json();
};

let tempIdCounter = 0;
const normalizeId = (value: any): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  // Fallback to a decrementing counter to keep keys stable when server omits ids
  tempIdCounter -= 1;
  return tempIdCounter;
};

const normalizeDate = (value: any): string => {
  if (!value) return new Date().toISOString();

  const toDate = (input: string): Date => {
    if (!input.includes('T')) {
      const candidate = `${input.replace(' ', 'T')}Z`;
      const parsedCandidate = new Date(candidate);
      if (!Number.isNaN(parsedCandidate.getTime())) return parsedCandidate;
    }
    return new Date(input);
  };

  const parsed = typeof value === 'string' ? toDate(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const normalizePost = (post: any): Post => {
  if (!post) {
    return {
      id: normalizeId(undefined),
      title: '',
      content: '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Post;
  }

  const { body, content, id, ID, postId, postID, createdAt, created_at, updatedAt, updated_at, ...rest } = post;
  const normalizedId = normalizeId(id ?? ID ?? postId ?? postID);
  const created = createdAt ?? created_at;
  const updated = updatedAt ?? updated_at;

  return {
    ...rest,
    id: normalizedId,
    content: content ?? body ?? '',
    createdAt: normalizeDate(created),
    updatedAt: normalizeDate(updated),
  } as Post;
};

const normalizePostList = (data: any): PostListResponse => ({
  ...data,
  items: (data?.items || []).map(normalizePost),
});

const normalizeComment = (comment: any): Comment => {
  if (!comment) return {} as Comment;
  const { id, ID, createdAt, created_at, ...rest } = comment;
  return {
    ...rest,
    id: normalizeId(id ?? ID),
    createdAt: normalizeDate(createdAt ?? created_at),
  } as Comment;
};

const normalizeCommentList = (data: any): CommentListResponse => ({
  ...data,
  items: (data?.items || []).map(normalizeComment),
});

export const api = {
  auth: {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      return handleResponse(res);
    },
    register: async (payload: RegisterRequest): Promise<AuthResponse> => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    initAdmin: async (payload: InitAdminRequest): Promise<AuthResponse> => {
      const res = await fetch(`${BASE_URL}/auth/admin/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return handleResponse(res);
    },
    me: async (): Promise<User> => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
  comments: {
    list: async (postId: number | string, params: { limit?: number; offset?: number } = {}): Promise<CommentListResponse> => {
      const query = new URLSearchParams({ 
        limit: (params.limit || 20).toString(), 
        offset: (params.offset || 0).toString() 
      });
      const res = await fetch(`${BASE_URL}/posts/${postId}/comments?${query}`);
      const data = await handleResponse(res);
      return normalizeCommentList(data);
    },
    create: async (postId: number | string, body: string): Promise<Comment> => {
      const res = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ body }),
      });
      const data = await handleResponse(res);
      return normalizeComment(data);
    },
    delete: async (postId: number | string, commentId: number): Promise<void> => {
      const res = await fetch(`${BASE_URL}/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  posts: {
    getAll: async (params: { limit?: number; offset?: number } = {}): Promise<PostListResponse> => {
      const query = new URLSearchParams({ 
        limit: (params.limit || 20).toString(), 
        offset: (params.offset || 0).toString(),
        sort: 'created_at',
        order: 'desc'
      });
      const res = await fetch(`${BASE_URL}/posts?${query}`);
      const data = await handleResponse(res);
      return normalizePostList(data);
    },
    getOne: async (id: string | number): Promise<Post> => {
      const res = await fetch(`${BASE_URL}/posts/${id}`);
      const data = await handleResponse(res);
      return normalizePost(data);
    },
    // Admin/Management endpoints
    getManage: async (params: { limit?: number; offset?: number } = {}): Promise<PostListResponse> => {
      const query = new URLSearchParams({ 
        limit: (params.limit || 20).toString(), 
        offset: (params.offset || 0).toString() 
      });
      const res = await fetch(`${BASE_URL}/posts/manage?${query}`, {
        headers: getHeaders(),
      });
      const data = await handleResponse(res);
      return normalizePostList(data);
    },
    create: async (data: PostPayload): Promise<Post> => {
      const res = await fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      const responseData = await handleResponse(res);
      return normalizePost(responseData);
    },
    update: async (id: number, data: PostPayload): Promise<Post> => {
      const res = await fetch(`${BASE_URL}/posts/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      const responseData = await handleResponse(res);
      return normalizePost(responseData);
    },
    publish: async (id: number): Promise<void> => {
      const res = await fetch(`${BASE_URL}/posts/${id}/publish`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    delete: async (id: number): Promise<void> => {
      const res = await fetch(`${BASE_URL}/posts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    }
  },
  settings: {
    getAll: async (): Promise<SettingsResponse> => {
      const res = await fetch(`${BASE_URL}/settings`);
      return handleResponse(res);
    },
    update: async (key: string, data: UpdateSettingRequest): Promise<Setting> => {
      const res = await fetch(`${BASE_URL}/settings/${key}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    }
  }
};
