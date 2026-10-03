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

type MembersPanelProps = {
  users: readonly IPeopleDirectoryCacheRow[];
  currentUserId: string;
  roleLabel: (role: UserRole) => string;
  onEdit: (user: IPeopleDirectoryCacheRow) => void;
  onDeactivate: (user: IPeopleDirectoryCacheRow) => void;
  onInvite?: () => void;
};

const FILL_TILE_UNTIL = 6;

export function MembersPanel({ users, currentUserId, roleLabel, onEdit, onDeactivate, onInvite }: MembersPanelProps) {
  const { t } = useTranslation();

  return (
    <Panel className="flex-1 gap-1 p-1.5">
      {users.length === 0 ? <EmptyState variant="inline" icon="users" title={t('screens.users.no-users')} /> : null}
      {users.map((user) => {
        const self = user.id === currentUserId;
        return (
          <ListRow
            key={user.id}
            icon="user"
            title={[user.name, user.lastName].filter(Boolean).join(' ')}
            subtitle={`${roleLabel(user.role)} · ${user.isActive ? t('screens.users.active') : t('screens.users.inactive')}`}
            trailing={
              <View className="flex-row items-center gap-1">
                {self ? <StatusBadge label={t('screens.users.you')} className="self-center" /> : null}
                <Button size="sm" variant="ghost" onPress={() => onEdit(user)}>
                  <Text>{t('common.edit')}</Text>
                </Button>
                {user.isActive && !self ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    accessibilityLabel={`${t('screens.users.deactivate')} ${user.name}`}
                    onPress={() => onDeactivate(user)}>
                    <Icon name="user-minus" className="text-error-strong size-4" />
                  </Button>
                ) : null}
              </View>
            }
          />
        );
      })}
      {onInvite ? (
        <CreateTile
          layout={users.length <= FILL_TILE_UNTIL ? 'fill' : 'row'}
          label={t('screens.users.invite-someone')}
          hint={users.length <= FILL_TILE_UNTIL ? t('screens.users.invite-hint') : undefined}
          onPress={onInvite}
        />
      ) : null}
    </Panel>
  );
}
