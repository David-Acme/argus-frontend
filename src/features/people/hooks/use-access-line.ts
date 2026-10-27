import type { TranslationKey, UserRole } from '@/core/types';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleAreas } from '@/features/people/model/role-areas';
import type { RoleArea } from '@/features/people/model/role-areas';

const AREA: Readonly<Record<RoleArea, TranslationKey>> = {
  cameras: 'screens.users.area-cameras',
  agenda: 'screens.users.area-agenda',
  projects: 'screens.users.area-projects',
  activity: 'screens.users.area-activity',
  people: 'screens.users.area-people',
  security: 'screens.users.area-security',
};

export function useAccessLine(role: UserRole): string {
  const { t } = useTranslation();
  const view = useAccessView();
  const { manages, views, pausedBy } = roleAreas(view, role);
  if (pausedBy)
    return t('screens.users.role-paused', {
      module: view.moduleNames.get(pausedBy) ?? t('screens.modules.core-name'),
    });
  const list = (areas: readonly RoleArea[]) => areas.map((area) => t(AREA[area])).join(', ');
  const parts = [
    ...(manages.length > 0 ? [t('screens.users.role-manages', { areas: list(manages) })] : []),
    ...(views.length > 0 ? [t('screens.users.role-views', { areas: list(views) })] : []),
  ];
  return parts.length > 0 ? parts.join(' · ') : t('screens.users.role-only-own');
}
