import type { UserRole } from '@/core/types';

export interface IAuthUser {
  id: number;
  name: string;
  role: UserRole;
  isActive: boolean;
  personId: number | null;
}

export interface IAuthSession {
  accessToken: string;
  refreshToken: string;
  deviceSecret?: string | null;
  user: IAuthUser;
}
