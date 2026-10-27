import { useRouter } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';

const SECURITY_HREF = '/security';

export function SecurityCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const summary = useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary);
  const counts =
    summary && summary.camerasTotal > 0
      ? { online: summary.camerasOnline, total: summary.camerasTotal }
      : null;
  return (
    <Row
      leading={<Avatar icon="shield" tone="accent" />}
      title={t('screens.navigation.security')}
      meta={
        counts
          ? t('screens.cameras.card.online', {
              online: String(counts.online),
              total: String(counts.total),
            })
          : t('screens.cameras.card.none')
      }
      chevron
      onPress={() => router.push(SECURITY_HREF)}
    />
  );
}
