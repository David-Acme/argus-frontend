import { cameraService } from '@/core/services/camera.service';
import { notificationService } from '@/core/services/notification.service';
import { reminderService } from '@/core/services/reminder.service';
import type { ModelOf } from '@/core/types';
import { useObservable } from './use-observable';

type DashboardData = {
  cameras: ModelOf<'camera'>[];
  reminders: ModelOf<'reminder'>[];
  unreadNotifications: number;
};

/**
 * Reads the local synchronized projection used by the dashboard.
 * The screen stays independent from WatermelonDB/RxJS details and updates
 * automatically when the sync service receives new records.
 */
export function useDashboardData(userId: number | null): DashboardData {
  const userKey = userId == null ? '' : String(userId);
  const cameras = useObservable(
    () => cameraService.observeList(),
    [],
    [],
  );
  const reminders = useObservable(
    () => reminderService.observeForUser(userKey),
    [],
    [userKey],
  );
  const unreadNotifications = useObservable(
    () => notificationService.observeUnreadCountForUser(userKey),
    0,
    [userKey],
  );

  return { cameras, reminders, unreadNotifications };
}
