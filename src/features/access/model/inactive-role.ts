import type { TranslateFn, UserRole } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { hasCapability, type AccessView } from '@/shared/libs/capabilities';
import { roleLabelOf } from '@/shared/libs/role-label';

export type InactiveRole =
  | { kind: 'module'; role: UserRole; moduleId: string; moduleName: string }
  | { kind: 'paused'; role: UserRole }
  | { kind: 'unknown' };

export function inactiveRoleOf(view: AccessView): InactiveRole | null {
  if (view.roleActive) return null;
  if (view.role === null) return { kind: 'unknown' };
  if (view.roleModule === null) return { kind: 'paused', role: view.role };
  return {
    kind: 'module',
    role: view.role,
    moduleId: view.roleModule,
    moduleName: view.moduleNames.get(view.roleModule) ?? view.roleModule,
  };
}

export type InactiveRoleCopy = {
  title: string;
  body: string;
};

export function inactiveRoleCopy(inactive: InactiveRole, t: TranslateFn): InactiveRoleCopy {
  if (inactive.kind === 'module') {
    return {
      title: t('screens.access.inactive.title', {
        role: roleLabelOf(inactive.role, t),
        module: inactive.moduleName,
      }),
      body: t('screens.access.inactive.body'),
    };
  }
  if (inactive.kind === 'paused') {
    return { title: t('screens.access.inactive.paused-title'), body: t('screens.access.inactive.body') };
  }
  return { title: t('screens.access.inactive.unknown-title'), body: t('screens.access.inactive.unknown-body') };
}

export type InactiveRoleOffers = {
  alerts: boolean;
  reminders: { editable: boolean } | null;
  panic: boolean;
  moduleRequest: { moduleId: string; moduleName: string } | null;
  profile: true;
  signOut: true;
};

export function inactiveRoleOffers(view: AccessView, inactive: InactiveRole): InactiveRoleOffers {
  return {
    alerts: hasCapability(view, CAPABILITY.safetyRespond),
    reminders: hasCapability(view, CAPABILITY.remindersRead)
      ? { editable: hasCapability(view, CAPABILITY.remindersWrite) }
      : null,
    panic: hasCapability(view, CAPABILITY.safetyPanic),
    moduleRequest:
      inactive.kind === 'module' && hasCapability(view, CAPABILITY.modulesRequest)
        ? { moduleId: inactive.moduleId, moduleName: inactive.moduleName }
        : null,
    profile: true,
    signOut: true,
  };
}
