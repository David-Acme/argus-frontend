import { lazyScreen } from '@/shared/libs/lazy-screen';
export const ProfileScreen = lazyScreen(() => import('./screens/profile-screen'), 'default');
