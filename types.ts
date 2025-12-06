export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: number;
  title: string;
  summary?: string;
  content: string; // Markdown or HTML returned by API
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  slug?: string;
}

export interface PostListResponse {
  items: Post[];
  total: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export type InitAdminRequest = RegisterRequest;

export interface PostPayload {
  title: string;
  summary?: string;
  body: string; // Field name expected by backend when creating/updating
  status: PostStatus;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  body: string;
  visible: boolean;
  createdAt: string;
  user?: User; // Optional, if backend returns user info with comment, otherwise we might just have userId
}

export interface CommentListResponse {
  items: Comment[];
  total: number;
}
