export interface User {
  id: number;
  username: string;
  email: string;
  emailSha256?: string;
  roles: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Image {
  id: number;
  filename: string;
  originalName: string;
  alt?: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  url: string;
  userId: number;
  storageBackend: string;
  createdAt: string;
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
  userId?: number;
  user?: {
    id: number;
    username: string;
    emailSha256?: string;
  };
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

export interface UserListResponse {
  items: User[];
  total: number;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
}

export interface SetUserRolesRequest {
  roleIds: number[];
}

export interface Permission {
  name: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

export interface RoleListResponse {
  items: Role[];
  total: number;
}

export interface CreateRoleRequest {
  name: string;
  permissions: Permission[];
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: Permission[];
}

export interface Setting {
  key: string;
  value: string;
  description: string;
}

export interface SettingsResponse {
  items: Setting[];
}

export interface UpdateSettingRequest {
  value: string;
  description?: string;
}
