import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { PANEL_PARAM } from '@/shared/constants';
import { panelRequestOf } from '@/features/home/model/notification-panel';

export function useNotificationPanel(canRead: boolean): boolean {
  const params = useLocalSearchParams<{ panel?: string | string[] }>();
  const router = useRouter();
  const { open, clear } = panelRequestOf(params, canRead);

  useEffect(() => {
    if (clear) router.setParams({ [PANEL_PARAM]: undefined });
  }, [clear, router]);

  return open;
}
