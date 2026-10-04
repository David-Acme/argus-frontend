import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { SessionInsights } from '@/features/sessions/components/session-insights';
import { useSessionLabels } from '@/features/sessions/hooks/use-session-labels';
import {
  SESSION_GROUP_ICONS,
  type ConnectedUser,
  type UserSessionRow,
} from '@/features/sessions/model/sessions';

export type ConnectedPerson = {
  name: string;
  detail: string;
  isSelf: boolean;
};

type ConnectedDevicesPanelProps = {
  users: readonly ConnectedUser[];
  now: number;
  loading: boolean;
  failed: boolean;
  personOf: (userId: number) => ConnectedPerson;
  onOpen: (userId: number) => void;
  onRetry: () => void;
  className?: string;
};

const RECENT_SIGN_INS = 6;

export function ConnectedDevicesPanel({
  users,
  now,
  loading,
  failed,
  personOf,
  onOpen,
  onRetry,
  className,
}: ConnectedDevicesPanelProps) {
  const { t } = useTranslation();
  const labels = useSessionLabels(now);
  const rows: UserSessionRow[] = users.flatMap((user) =>
    user.sessions.map((session) => ({ ...session, userId: user.userId }))
  );

  if (users.length === 0) {
    return (
      <Panel className={cn('min-h-40 p-1.5', className)}>
        <EmptyState
          variant="panel"
          icon={failed ? 'wifi-off' : 'monitor-smartphone'}
          title={
            failed
              ? t('screens.sessions.admin.load-error')
              : loading
                ? t('screens.sessions.admin.loading')
                : t('screens.sessions.admin.empty')
          }
          hint={failed || loading ? undefined : t('screens.sessions.admin.empty-hint')}
          action={
            failed ? (
              <Button size="sm" variant="outline" onPress={onRetry}>
                <Text>{t('common.retry')}</Text>
              </Button>
            ) : undefined
          }
        />
      </Panel>
    );
  }

  return (
    <Panel className={cn('gap-1 p-1.5', className)}>
      {users.map((user) => {
        const person = personOf(user.userId);
        const latest = user.sessions[0];
        const devices = labels.deviceCount(user.sessions.length);
        const activity = latest ? labels.activityLabel({ ...latest, current: false }) : '';
        return (
          <ListRow
            key={user.userId}
            icon="user"
            title={person.isSelf ? `${person.name} · ${t('screens.users.you')}` : person.name}
            subtitle={`${person.detail} · ${devices} · ${activity}`}
            chevron
            onPress={() => onOpen(user.userId)}
            trailing={
              <View className="flex-row items-center gap-1.5">
                {user.groups.map((group) => (
                  <View
                    key={group}
                    className="bg-surface-secondary size-7 items-center justify-center rounded-full">
                    <Icon
                      name={SESSION_GROUP_ICONS[group]}
                      className="text-foreground-secondary size-3.5"
                    />
                  </View>
                ))}
              </View>
            }
          />
        );
      })}
      <SessionInsights
        sessions={rows}
        now={now}
        ownerOf={(session) => personOf(session.userId).name}
        limit={RECENT_SIGN_INS}
        className="border-border-subtle mx-2.5 mt-2 border-t px-0.5 pt-4 pb-2.5"
      />
    </Panel>
  );
}
