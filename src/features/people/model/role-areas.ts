import type { TableName, UserRole } from '@/core/types';
import { MODULE_IDS } from '@/shared/constants';
import { isModuleActive, moduleOfRole, type AccessView } from '@/shared/libs/capabilities';
import { hasAccess } from '@/shared/libs/role-access';

export type RoleArea = 'cameras' | 'agenda' | 'projects' | 'activity' | 'people' | 'security';

export type RoleAreas = {
  manages: RoleArea[];
  views: RoleArea[];
  pausedBy: string | null;
};

const TABLE_AREAS: readonly { area: RoleArea; table: TableName; moduleId: string }[] = [
  { area: 'cameras', table: 'camera', moduleId: MODULE_IDS.surveillance },
  { area: 'agenda', table: 'calendar_event', moduleId: MODULE_IDS.productivity },
  { area: 'projects', table: 'project', moduleId: MODULE_IDS.productivity },
  { area: 'activity', table: 'event', moduleId: MODULE_IDS.surveillance },
];

export function roleAreas(view: AccessView, role: UserRole): RoleAreas {
  const bringer = moduleOfRole(view, role);
  if (bringer !== null && !isModuleActive(view, bringer)) return { manages: [], views: [], pausedBy: bringer };
  const manages: RoleArea[] = [];
  const views: RoleArea[] = [];
  for (const { area, table, moduleId } of TABLE_AREAS) {
    if (!isModuleActive(view, moduleId)) continue;
    if (hasAccess(role, table, 'create')) manages.push(area);
    else if (hasAccess(role, table, 'read')) views.push(area);
  }
  if (role === 'owner') {
    manages.push('people');
    if (isModuleActive(view, MODULE_IDS.surveillance)) manages.push('security');
  }
  if (role === 'guard') views.push('people');
  return { manages, views, pausedBy: null };
}
