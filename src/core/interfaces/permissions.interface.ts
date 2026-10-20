import type { PermissionAnswer, RuntimePermission } from '@/core/types';

export interface IPermissionsService {
  read(kind: RuntimePermission): Promise<PermissionAnswer>;
  request(kind: RuntimePermission): Promise<PermissionAnswer>;
  openSettings(): Promise<void>;
  asked(kind: RuntimePermission): boolean;
  markAsked(kind: RuntimePermission): void;
}
