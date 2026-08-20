import type { SyncOperation, UserRole } from '@/core/types';

export interface ISocketEmitDto {
  operation: SyncOperation;
  option: string;
  info: unknown;
}

export interface IWsMessage {
  type: string;
  payload?: unknown;
}

export interface IWsError {
  type: string;
  status: number;
  error: string;
}

export interface IInitialInfo {
  id: number;
  role: UserRole;
  isActive: boolean;
}
