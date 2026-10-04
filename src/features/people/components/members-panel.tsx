import { View } from 'react-native';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { UserRole } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useSessionLabels } from '@/features/sessions';

type MembersPanelProps = {
  users: readonly IPeopleDirectoryCacheRow[];
  currentUserId: string;
  roleLabel: (role: UserRole) => string;
  devicesOf: (user: IPeopleDirectoryCacheRow) => number;
  onEdit: (user: IPeopleDirectoryCacheRow) => void;
  onOpenAccess: (user: IPeopleDirectoryCacheRow) => void;
  onInvite?: () => void;
};

export function MembersPanel({
  users,
  currentUserId,
  roleLabel,
  devicesOf,
  onEdit,
  onOpenAccess,
  onInvite,
}: MembersPanelProps) {
  const { t } = useTranslation();
  const { deviceCount } = useSessionLabels(0);

  const statusOf = (user: IPeopleDirectoryCacheRow) => {
    if (!user.isActive) return t('screens.sessions.admin.account-disabled');
    const devices = devicesOf(user);
    return devices > 0 ? deviceCount(devices) : t('screens.users.no-devices');
  };

  return (
    <Panel className="gap-1 p-1.5">
      {users.length === 0 ? (
        <EmptyState variant="inline" icon="users" title={t('screens.users.no-users')} />
      ) : null}
      {users.map((user) => {
        const self = user.id === currentUserId;
        const name = [user.name, user.lastName].filter(Boolean).join(' ');
        return (
          <ListRow
            key={user.id}
            icon={user.isActive ? 'user' : 'user-minus'}
            title={name}
            subtitle={`${roleLabel(user.role)} · ${statusOf(user)}`}
            onPress={() => onOpenAccess(user)}
            trailing={
              <View className="flex-row items-center gap-1">
                {self ? (
                  <StatusBadge label={t('screens.users.you')} className="self-center" />
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  accessibilityLabel={`${t('common.edit')} ${name}`}
                  onPress={() => onEdit(user)}>
                  <Text>{t('common.edit')}</Text>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  accessibilityLabel={t('screens.users.access-of', { name })}
                  onPress={() => onOpenAccess(user)}>
                  <Icon name="monitor-smartphone" className="text-foreground-secondary size-4" />
                </Button>
              </View>
            }
          />
        );
      })}
      {onInvite ? (
        <View className="p-1.5">
          <CreateTile layout="row" label={t('screens.users.invite-someone')} onPress={onInvite} />
        </View>
      ) : null}
    </Panel>
  );
}
