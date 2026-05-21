/** Chat API response shapes — covers all known backend envelope variants. */

export interface Chat {
  id: string | number;
  title?: string;
  createdAt?: string;
}

export interface ChatApiBodyData {
  chats?: Chat[];
  items?: Chat[];
  data?: Chat[];
  records?: Chat[];
  title?: string;
  totalrecords?: number;
  totalRecords?: number;
}

export interface ChatApiBody {
  data?: ChatApiBodyData | Chat[];
  chats?: Chat[];
  items?: Chat[];
  records?: Chat[];
  totalrecords?: number;
  totalRecords?: number;
}

/** Auth API response shapes — used by auth.service.ts */

export interface AuthData {
  access_token: string;
  refresh_token: string;
  userInfo?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
}

export interface LoginResponse {
  body: ApiResponse<AuthData>;
  status: number;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface ChatListResponse {
  body: ChatApiBody;
  status: number;
}
