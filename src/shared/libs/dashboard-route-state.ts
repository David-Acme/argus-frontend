import type { AuthStatus } from '@/core/types';

export type DashboardDestination =
  | 'loading'
  | 'welcome'
  | 'owner-enroll'
  | 'login'
  | 'unreachable'
  | 'home';

/**
 * A tab return already has an authenticated session, so it must render the
 * dashboard in its first frame and keep the root navigation claimed.
 */
export function initialDashboardDestination(authStatus: AuthStatus): DashboardDestination {
  return authStatus === 'signed-in' ? 'home' : 'loading';
}
