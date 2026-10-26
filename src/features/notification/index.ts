import { lazyScreen } from '@/shared/libs/lazy-screen';
export const NotificationLinkScreen = lazyScreen(
  () => import('./screens/notification-link-screen'),
  'default'
);
export { usePushRegistration } from './hooks/use-push-registration';
export { usePushListeners } from './hooks/use-push-listeners';
export { useNotificationPermission } from './hooks/use-notification-permission';
export { notificationHrefOf } from './model/notification-link';
