import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AuthSession } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SessionRow } from '@/features/sessions/components/session-row';
import { useSessionLabels } from '@/features/sessions/hooks/use-session-labels';
import { useUserSessions } from '@/features/sessions/hooks/use-user-sessions';

export type UserSessionsSubject = {
  userId: number;
  name: string;
  roleLabel: string;
  isActive: boolean;
  isSelf: boolean;
};

type UserSessionsDialogProps = {
  subject: UserSessionsSubject;
  open: boolean;
  now: number;
  fallback: readonly AuthSession[];
  onOpenChange: (open: boolean) => void;
  onCloseSession: (session: AuthSession, deviceLabel: string) => void;
  onCloseAll: (sessions: readonly AuthSession[]) => void;
  onDisable: (sessions: readonly AuthSession[]) => void;
  onEnable: () => void;
  extra?: ReactNode;
};

export function UserSessionsDialog({
  subject,
  open,
  now,
  fallback,
  onOpenChange,
  onCloseSession,
  onCloseAll,
  onDisable,
  onEnable,
  extra,
}: UserSessionsDialogProps) {
  const { t } = useTranslation();
  const labels = useSessionLabels(now);
  const { sessions, loading } = useUserSessions({
    userId: subject.userId,
    fallback,
    enabled: open,
  });

  const status = subject.isActive
    ? t('screens.sessions.admin.account-active')
    : t('screens.sessions.admin.account-disabled');

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={subject.name}
      description={subject.roleLabel}
      closeLabel={t('common.close')}
      footer={
        <View className="w-full flex-row flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            disabled={sessions.length === 0}
            onPress={() => onCloseAll(sessions)}>
            <Icon name="log-out" className="size-4" />
            <Text>{t('screens.sessions.admin.close-all')}</Text>
          </Button>
          {subject.isSelf ? null : subject.isActive ? (
            <Button variant="destructive" onPress={() => onDisable(sessions)}>
              <Icon name="user-minus" className="size-4" />
              <Text>{t('screens.sessions.admin.disable')}</Text>
            </Button>
          ) : (
            <Button onPress={onEnable}>
              <Icon name="user-check" className="size-4" />
              <Text>{t('screens.sessions.admin.enable')}</Text>
            </Button>
          )}
        </View>
      }>
      <View className="gap-3 pb-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <StatusBadge
            label={status}
            dotClassName={subject.isActive ? 'bg-success' : 'bg-error'}
          />
          {sessions.length > 0 ? (
            <Text variant="caption">{labels.deviceCount(sessions.length)}</Text>
          ) : null}
        </View>
        {sessions.length === 0 ? (
          <View className="bg-surface-secondary flex-row items-center gap-3 rounded-2xl px-4 py-3.5">
            <Icon
              name={loading ? 'loader-circle' : 'check-circle'}
              className="text-foreground-secondary size-5"
            />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="label">
                {loading
                  ? t('screens.sessions.admin.loading')
                  : t('screens.sessions.admin.no-sessions')}
              </Text>
              {loading ? null : (
                <Text variant="caption">
                  {subject.isActive
                    ? t('screens.sessions.admin.no-sessions-hint')
                    : t('screens.sessions.admin.disabled-hint')}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View className="divide-border-subtle divide-y">
            {sessions.map((session) => {
              const name = labels.nameOf(session);
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  name={session.current ? `${name} · ${t('screens.sessions.this-device')}` : name}
                  detail={`${labels.platformOf(session)} · ${labels.activityLabel(session)}`}
                  since={labels.sinceLabel(session)}
                  onClose={() => onCloseSession(session, name)}
                />
              );
            })}
          </View>
        )}
        {extra}
      </View>
    </AdaptiveDialog>
  );
}
