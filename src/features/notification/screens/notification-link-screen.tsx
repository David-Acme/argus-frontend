import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect } from 'react';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { CenteredScreen } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { notificationLinkTarget } from '../model/notification-link';

export default function NotificationLinkScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ notificationId?: string }>();
  const rows = useViewCacheRows<INotificationPreviewCacheRow>(VIEW_CACHE_KEYS.dashboardNotifications);
  const target = notificationLinkTarget(rows, params.notificationId);
  const href = target.kind === 'open' ? target.href : target.kind === 'home' ? '/' : null;
  const goHome = useCallback(() => router.replace('/'), [router]);

  useEffect(() => {
    if (href !== null) router.replace(href as Href);
  }, [href, router]);

  if (href !== null) return null;

  return (
    <CenteredScreen>
      <EmptyState
        icon="bell"
        title={t('screens.notification.opening')}
        hint={t('screens.notification.opening-hint')}
        variant="page"
        action={
          <Button variant="outline" onPress={goHome}>
            <Text>{t('screens.notification.go-home')}</Text>
          </Button>
        }
      />
    </CenteredScreen>
  );
}
