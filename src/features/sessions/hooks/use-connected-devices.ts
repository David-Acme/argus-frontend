import { useCallback, useEffect, useMemo, useState } from 'react';
import { sessionService } from '@/core/services/session.service';
import { synchronizeService } from '@/core/services/sync';
import type { AuthSession, SessionRevokeResult } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import {
  connectedUsersOf,
  sessionRowsOf,
  USER_SESSION_LENSES,
  withoutSessions,
} from '@/features/sessions/model/sessions';
import { sessionsService } from '@/features/sessions/services/sessions.service';

type UseConnectedDevicesOptions = {
  enabled?: boolean;
};

export type CloseUserSessionInput = {
  userId: number;
  session: AuthSession;
  deviceLabel: string;
};

export type CloseUserSessionsInput = {
  userId: number;
  userName: string;
  sessions: readonly AuthSession[];
};

const CLOCK_TICK_MS = 30_000;

const loadOverview = () => sessionsService.listEveryUser();

const nowSeconds = () => Math.floor(Date.now() / 1000);

const sessionIntents = (sessions: readonly AuthSession[]) =>
  sessions.map((session) => ({
    table: 'session' as const,
    kind: 'delete' as const,
    recordId: session.id,
  }));

export function useConnectedDevices({ enabled = true }: UseConnectedDevicesOptions = {}) {
  const { t } = useTranslation();
  const { data, status, reload, mutate } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.authUserSessions,
    load: loadOverview,
    enabled,
  });
  const flat = useMemo(() => sessionRowsOf(data), [data]);
  const { rows } = useOptimisticRows(flat, USER_SESSION_LENSES);
  const users = useMemo(() => connectedUsersOf(rows), [rows]);
  const [now, setNow] = useState(nowSeconds);

  const settle = useCallback(
    (result: SessionRevokeResult | null) => {
      mutate((previous) => withoutSessions(previous, result?.revoked ?? []));
      if (result?.current) void sessionService.endSession('closed-here');
      else void reload();
    },
    [mutate, reload]
  );

  const sessionsOf = useCallback(
    (userId: number): readonly AuthSession[] =>
      users.find((user) => user.userId === userId)?.sessions ?? [],
    [users]
  );

  const closeSession = useCallback(
    async ({ userId, session, deviceLabel }: CloseUserSessionInput) => {
      const response = await runOptimistic({
        intents: sessionIntents([session]),
        call: () => sessionsService.revokeOfUser(userId, session.id),
        success: t('screens.sessions.closed', { name: deviceLabel }),
        errorTitle: t('screens.sessions.close-error'),
      });
      if (response) settle(response.info);
    },
    [settle, t]
  );

  const closeEverySession = useCallback(
    async ({ userId, userName, sessions }: CloseUserSessionsInput) => {
      if (sessions.length === 0) return;
      const response = await runOptimistic({
        confirm: {
          title: t('screens.sessions.admin.confirm-all-title', { name: userName }),
          description: t('screens.sessions.admin.confirm-all-description'),
          confirmLabel: t('screens.sessions.admin.close-all'),
          intent: 'danger',
        },
        intents: sessionIntents(sessions),
        call: () => sessionsService.revokeAllOfUser(userId),
        success: t('screens.sessions.admin.closed-all', { name: userName }),
        errorTitle: t('screens.sessions.close-error'),
      });
      if (response) settle(response.info);
    },
    [settle, t]
  );

  const forget = useCallback(
    (userId: number) => {
      const gone = sessionsOf(userId).map((session) => session.id);
      mutate((previous) => withoutSessions(previous, gone));
    },
    [mutate, sessionsOf]
  );

  useEffect(() => {
    if (!enabled) return;
    const offUsers = synchronizeService.onUserSessionsChanged(() => void reload());
    const offOwn = synchronizeService.onSessionsChanged(() => void reload());
    return () => {
      offUsers();
      offOwn();
    };
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(nowSeconds()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  return {
    users,
    now,
    loading: status === 'loading',
    failed: status === 'failed' && data == null,
    reload,
    sessionsOf,
    closeSession,
    closeEverySession,
    forget,
  };
}
