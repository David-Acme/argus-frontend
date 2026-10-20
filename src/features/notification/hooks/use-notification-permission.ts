import { useEffect } from 'react';
import { permissionsService } from '@/core/services/permissions';
import { pushService } from '@/core/services/push';
import { useAuthStore } from '@/core/stores';
import { IS_NATIVE, NOTIFICATION_PROMPT_DELAY_MS } from '@/shared/constants';
import { ensurePermission } from '@/shared/libs/permission-prompt';

export function useNotificationPermission(): void {
  const signedIn = useAuthStore((state) => state.status === 'signed-in');

  useEffect(() => {
    if (!signedIn || !IS_NATIVE) return;
    let alive = true;
    const askOnce = async () => {
      const before = await permissionsService.read('notifications');
      if (before.granted || !alive) return;
      if ((await ensurePermission('notifications', { once: true })) && alive) await pushService.register();
    };
    const timer = setTimeout(() => void askOnce(), NOTIFICATION_PROMPT_DELAY_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [signedIn]);
}
