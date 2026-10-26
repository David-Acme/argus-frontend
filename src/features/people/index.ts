import { lazyScreen } from '@/shared/libs/lazy-screen';
export const PeopleDirectoryScreen = lazyScreen(
  () => import('./screens/people-directory-screen'),
  'default'
);
export const UsersScreen = lazyScreen(() => import('./screens/users-screen'), 'default');
export { usePresenceOverview } from './hooks/use-presence';
