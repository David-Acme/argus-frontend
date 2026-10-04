import { useCallback, useEffect, useMemo } from 'react';
import { synchronizeService } from '@/core/services/sync';
import type { AuthSession } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { SESSION_LENSES } from '@/features/sessions/model/sessions';
import { sessionsService } from '@/features/sessions/services/sessions.service';

type UseUserSessionsOptions = {
  userId: number;
  fallback: readonly AuthSession[];
  enabled: boolean;
};

const byRecentActivity = (left: AuthSession, right: AuthSession): number =>
  right.lastSeenAt - left.lastSeenAt || left.id.localeCompare(right.id);

export function useUserSessions({ userId, fallback, enabled }: UseUserSessionsOptions) {
  const load = useCallback(() => sessionsService.listOfUser(userId), [userId]);
  const { data, status, reload } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.authUserSessions,
    scope: String(userId),
    load,
    enabled,
  });
  const source = data?.sessions ?? fallback;
  const { rows } = useOptimisticRows(source, SESSION_LENSES);
  const sessions = useMemo(() => [...rows].sort(byRecentActivity), [rows]);

  useEffect(() => {
    if (!enabled) return;
    return synchronizeService.onUserSessionsChanged((changed) => {
      if (changed === userId) void reload();
    });
  }, [enabled, reload, userId]);

  return {
    sessions,
    loading: status === 'loading' && data == null && fallback.length === 0,
    reload,
  };
}
