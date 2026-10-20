import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { CenteredScreen } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useExpiry } from '@/shared/hooks/use-expiry';
import { NOTIFICATION_LINK_WAIT_MS, notificationLinkTarget } from '../model/notification-link';

type NotificationLinkProps = {
  onRetry: () => void;
};

export default function NotificationLinkScreen() {
  const [attempt, setAttempt] = useState(0);
  return <NotificationLink key={attempt} onRetry={() => setAttempt((value) => value + 1)} />;
}

function NotificationLink({ onRetry }: NotificationLinkProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ notificationId?: string }>();
  const rows = useViewCacheRows<INotificationPreviewCacheRow>(VIEW_CACHE_KEYS.dashboardNotifications);
  const waiting = notificationLinkTarget(rows, params.notificationId).kind === 'waiting';
  const waitedOut = useExpiry(waiting, NOTIFICATION_LINK_WAIT_MS);
  const target = notificationLinkTarget(rows, params.notificationId, waitedOut);
  const missing = target.kind === 'missing';
  const href = target.kind === 'open' ? target.href : target.kind === 'home' ? '/' : null;
  const goHome = useCallback(() => router.replace('/'), [router]);

  useEffect(() => {
    if (href !== null) router.replace(href as Href);
  }, [href, router]);

  if (href !== null) return null;

  return (
    <CenteredScreen>
      <EmptyState
        icon={missing ? 'triangle-alert' : 'bell'}
        title={t(missing ? 'screens.notification.missing' : 'screens.notification.opening')}
        hint={t(missing ? 'screens.notification.missing-hint' : 'screens.notification.opening-hint')}
        variant="page"
        action={
          <View className="flex-row flex-wrap justify-center gap-2">
            {missing ? (
              <Button onPress={onRetry}>
                <Text>{t('common.retry')}</Text>
              </Button>
            ) : null}
            <Button variant="outline" onPress={goHome}>
              <Text>{t('screens.notification.go-home')}</Text>
            </Button>
          </View>
        }
      />
    </CenteredScreen>
  );
}
