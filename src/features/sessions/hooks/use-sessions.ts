import { useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '@/core/services/auth.service';
import { synchronizeService } from '@/core/services/sync';
import type { AuthSession, AuthSessionList, SessionRevokeResult } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { runServiceAction } from '@/shared/libs/service-action';
import { overviewOf, SESSION_LENSES } from '@/features/sessions/model/sessions';
import { sessionsService } from '@/features/sessions/services/sessions.service';

type SessionBusy = 'here' | 'others' | 'all' | null;

type UseSessionsOptions = {
  enabled?: boolean;
};

const EMPTY: readonly AuthSession[] = [];
const CLOCK_TICK_MS = 30_000;

const loadSessions = () => sessionsService.list();

const nowSeconds = () => Math.floor(Date.now() / 1000);

function withoutRevoked(
  list: AuthSessionList | null,
  result: SessionRevokeResult | null
): AuthSessionList | null {
  if (!list || !result || result.revoked.length === 0) return list;
  const revoked = new Set(result.revoked);
  return { sessions: list.sessions.filter((session) => !revoked.has(session.id)) };
}

export function useSessions({ enabled = true }: UseSessionsOptions = {}) {
  const { t } = useTranslation();
  const { data, status, reload, mutate } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.authSessions,
    load: loadSessions,
    enabled,
  });
  const { rows } = useOptimisticRows(data?.sessions ?? EMPTY, SESSION_LENSES);
  const overview = useMemo(() => overviewOf(rows), [rows]);
  const [busy, setBusy] = useState<SessionBusy>(null);
  const [now, setNow] = useState(nowSeconds);

  const settle = useCallback(
    (result: SessionRevokeResult | null) => {
      mutate((previous) => withoutRevoked(previous, result));
      void reload();
    },
    [mutate, reload]
  );

  const closeOne = useCallback(
    async (session: AuthSession, name: string) => {
      const response = await runOptimistic({
        intents: [{ table: 'session', kind: 'delete', recordId: session.id }],
        call: () => sessionsService.revoke(session.id),
        success: t('screens.sessions.closed', { name }),
        errorTitle: t('screens.sessions.close-error'),
      });
      if (response) settle(response.info);
    },
    [settle, t]
  );

  const closeOthers = useCallback(async () => {
    const others = overview.others;
    if (others.length === 0) return;
    const accepted = await confirm({
      title: t('screens.sessions.confirm-others-title'),
      description: t('screens.sessions.confirm-others-description', {
        count: String(others.length),
      }),
      confirmLabel: t('screens.sessions.close-others'),
      intent: 'danger',
    });
    if (!accepted) return;
    setBusy('others');
    try {
      const response = await runOptimistic({
        intents: others.map((session) => ({
          table: 'session' as const,
          kind: 'delete' as const,
          recordId: session.id,
        })),
        call: () => sessionsService.revokeOthers(),
        success: t('screens.sessions.closed-others'),
        errorTitle: t('screens.sessions.close-error'),
      });
      if (response) settle(response.info);
    } finally {
      setBusy(null);
    }
  }, [overview.others, settle, t]);

  const closeAll = useCallback(async () => {
    setBusy('all');
    try {
      await runServiceAction({
        confirm: {
          title: t('screens.sessions.confirm-all-title'),
          description: t('screens.sessions.confirm-all-description'),
          confirmLabel: t('screens.sessions.sign-out-everywhere'),
          intent: 'danger',
        },
        call: () => sessionsService.revokeAll(),
        errorTitle: t('screens.sessions.close-error'),
      });
    } finally {
      setBusy(null);
    }
  }, [t]);

  const closeHere = useCallback(async () => {
    const accepted = await confirm({
      title: t('screens.sessions.confirm-here-title'),
      description: t('screens.sessions.confirm-here-description'),
      confirmLabel: t('screens.sessions.close-here'),
      intent: 'warning',
    });
    if (!accepted) return;
    setBusy('here');
    try {
      await authService.logout('closed-here');
    } finally {
      setBusy(null);
    }
  }, [t]);

  useEffect(() => {
    if (!enabled) return;
    return synchronizeService.onSessionsChanged(() => void reload());
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(nowSeconds()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  return {
    overview,
    now,
    loading: status === 'loading',
    failed: status === 'failed' && data == null,
    busy,
    reload,
    closeOne,
    closeOthers,
    closeAll,
    closeHere,
  };
}
