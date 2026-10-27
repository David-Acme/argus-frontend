import { lazyScreen } from '@/shared/libs/lazy-screen';
export const PeopleScreen = lazyScreen(() => import('./screens/people-screen'), 'default');
export { usePresenceOverview } from './hooks/use-presence';
