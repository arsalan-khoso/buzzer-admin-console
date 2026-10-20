export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'ORG';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
