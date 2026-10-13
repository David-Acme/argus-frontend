import type { UserRole } from './database.type';
import type { ModuleRecord } from './modules.type';
import type { NetRemoteState } from './net.type';

export type AccessRole = {
  id: string;
  module: string;
  active: boolean;
};

export type AppAccess = {
  userId: number;
  role: UserRole | null;
  roleActive: boolean;
  capabilities: string[];
  roles: AccessRole[];
  modules: ModuleRecord[];
  version: number | null;
  timeZone?: string | null;
  receivedAt: number;
};

export type AppContext = Omit<AppAccess, 'receivedAt'> & {
  ownerCatalog: ModuleRecord[] | null;
  remote: NetRemoteState | null;
};
