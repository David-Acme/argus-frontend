import { lazyScreen } from '@/shared/libs/lazy-screen';
export const ActivityScreen = lazyScreen(() => import('./screens/activity-screen'), 'default');
