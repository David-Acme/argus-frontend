import type { UserRole } from '@/core/types';

export interface IResponseLoginDto {
  accessToken: string;
  refreshToken: string;
  userId: number;
  name: string;
  role: UserRole;
  personId: number | null;
  alreadyRegistered?: boolean;
  device_secret?: string;
}

export interface IResponseStatusDto {
  userId: number;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface IServerStatus {
  paired: boolean;
  hasOwner: boolean;
}

export interface IRegisterInput {
  imageUri: string;
  name?: string;
  inviteCode?: string;
}

export interface ICreateDeviceLoginResponse {
  challengeId: string;
  expiresAt: number;
}

export type DeviceLoginStatus = 'pending' | 'approved' | 'expired';

export interface IDeviceLoginStatusResponse {
  status: DeviceLoginStatus;
  accessToken?: string;
  refreshToken?: string;
  userId?: number;
  name?: string;
  role?: UserRole;
  device_secret?: string;
}
