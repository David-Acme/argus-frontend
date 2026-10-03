import type { AuthStatus } from '@/core/types';

export type DashboardDestination =
  | 'loading'
  | 'welcome'
  | 'owner-enroll'
  | 'login'
  | 'unreachable'
  | 'home';

export function initialDashboardDestination(authStatus: AuthStatus): DashboardDestination {
  return authStatus === 'signed-in' ? 'home' : 'loading';
}
