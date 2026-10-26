import { lazyScreen } from '@/shared/libs/lazy-screen';
export const SettingsScreen = lazyScreen(() => import('./screens/settings-screen'), 'default');
