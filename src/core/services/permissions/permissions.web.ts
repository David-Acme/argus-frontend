import type { IPermissionsService } from '@/core/interfaces';
import type { PermissionAnswer } from '@/core/types';

const GRANTED: PermissionAnswer = { granted: true, canAskAgain: true };

export const permissionsService: IPermissionsService = {
  read: () => Promise.resolve(GRANTED),
  request: () => Promise.resolve(GRANTED),
  openSettings: () => Promise.resolve(),
  asked: () => false,
  markAsked: () => undefined,
};
