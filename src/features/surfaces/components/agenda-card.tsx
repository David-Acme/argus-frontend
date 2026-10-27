import { useRouter } from 'expo-router';
import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';

const AGENDA_HREF = '/agenda';

export function AgendaCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const summary = useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary);
  const tasks = summary?.tasksOpen ?? 0;
  const projects = summary?.projectsActive ?? 0;
  const meta = [
    tasks > 0
      ? t('screens.navigation.agenda-card.tasks', { count: String(tasks) })
      : t('screens.navigation.agenda-card.no-tasks'),
    projects > 0 ? t('screens.navigation.agenda-card.projects', { count: String(projects) }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Row
      leading={<Avatar icon="cal" tone="accent" />}
      title={t('screens.navigation.agenda')}
      meta={meta}
      chevron
      onPress={() => router.push(AGENDA_HREF)}
    />
  );
}
