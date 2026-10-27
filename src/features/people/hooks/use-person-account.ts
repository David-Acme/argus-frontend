import type { AuthSession } from '@/core/types';
import { synchronizeService } from '@/core/services/sync';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { useConnectedDevices, useUserSessions } from '@/features/sessions';
import { ACCOUNT_WORDS } from '@/features/people/constants/people.constant';
import type { Ask } from '@/features/people/hooks/use-ask';
import type { PersonLine } from '@/features/people/model/people';
import { userManagementService } from '@/features/people/services/user-management.service';

type AccountInput = { person: PersonLine; enabled: boolean; ask: Ask['ask'] };

const sessionDeletes = (sessions: readonly AuthSession[]) =>
  sessions.map((session) => ({
    table: 'session' as const,
    kind: 'delete' as const,
    recordId: session.id,
  }));

export function usePersonAccount({ person, enabled, ask }: AccountInput) {
  const { t } = useTranslation();
  const userId = Number(person.id);
  const devices = useConnectedDevices({ enabled });
  const own = useUserSessions({ userId, fallback: devices.sessionsOf(userId), enabled });

  const setActive = (isActive: boolean) => {
    const words = ACCOUNT_WORDS[isActive ? 'enable' : 'disable'];
    const sessions = isActive ? [] : own.sessions;
    ask({
      title: t(words.title, { name: person.name }),
      body: t(words.body),
      confirmLabel: t(words.confirm),
      destructive: !isActive,
      run: () =>
        runOptimistic({
          intents: [
            { table: 'user', kind: 'update', recordId: person.id, values: { isActive } },
            ...sessionDeletes(sessions),
          ],
          call: () => userManagementService.update(userId, { isActive }),
          success: t(words.done, { name: person.name }),
        }).then((response) => {
          if (!response) return;
          if (!isActive) devices.forget(userId);
          void synchronizeService.syncOnce();
          void devices.reload();
        }),
    });
  };

  const closeAll = () =>
    ask({
      title: t('screens.sessions.admin.confirm-all-title', { name: person.name }),
      body: t('screens.sessions.admin.confirm-all-description'),
      confirmLabel: t('screens.sessions.admin.close-all'),
      destructive: true,
      run: () =>
        devices.closeEverySession({ userId, userName: person.name, sessions: own.sessions }),
    });

  return {
    sessions: own.sessions,
    loading: own.loading,
    failed: own.failed,
    reload: own.reload,
    now: devices.now,
    closeOne: (session: AuthSession, deviceLabel: string) =>
      void devices.closeSession({ userId, session, deviceLabel }),
    closeAll,
    deactivate: () => setActive(false),
    activate: () => setActive(true),
  };
}

export type PersonAccount = ReturnType<typeof usePersonAccount>;
