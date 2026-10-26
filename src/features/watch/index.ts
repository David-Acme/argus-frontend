import { lazyScreen } from '@/shared/libs/lazy-screen';
export { WatchPill } from './components/watch-pill';
export const WatchScreen = lazyScreen(() => import('./screens/watch-screen'), 'default');
export { WatchNotificationAction } from './components/watch-notification-action';
export { WATCH_NOTIFICATION_ICONS, watchNotificationKind } from './model/watch-notification';
