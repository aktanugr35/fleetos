import type { UserRole } from './enums';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}
