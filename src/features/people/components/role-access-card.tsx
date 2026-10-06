import { View } from 'react-native';
import type { UserRole } from '@/core/types';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleAreas, type RoleArea } from '@/features/people/model/role-areas';

type RoleAccessCardProps = {
  roleLabel: (role: UserRole) => string;
  counts: Partial<Record<UserRole, number>>;
};

const ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

export function RoleAccessCard({ roleLabel, counts }: RoleAccessCardProps) {
  const { t } = useTranslation();
  const view = useAccessView();
  const list = (areas: readonly RoleArea[]) => areas.map((area) => t(`screens.users.area-${area}`)).join(', ');

  return (
    <Panel className="gap-0 py-2">
      {ROLES.map((role) => {
        const { manages, views, pausedBy } = roleAreas(view, role);
        const moduleName = pausedBy ? (view.moduleNames.get(pausedBy) ?? t('screens.modules.core-name')) : null;
        return (
          <View key={role} className="border-border-subtle gap-1 border-b py-3 last:border-b-0">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text className="font-semibold">{roleLabel(role)}</Text>
              <Text variant="caption">
                {t('screens.users.role-members', { count: String(counts[role] ?? 0) })}
              </Text>
            </View>
            {moduleName ? (
              <Text variant="caption" className="text-foreground-secondary">
                {t('screens.users.role-paused', { module: moduleName })}
              </Text>
            ) : null}
            {manages.length > 0 ? (
              <Text variant="caption" className="text-foreground-secondary">
                {t('screens.users.role-manages')}: {list(manages)}
              </Text>
            ) : null}
            {views.length > 0 ? (
              <Text variant="caption" className="text-foreground-secondary">
                {t('screens.users.role-views')}: {list(views)}
              </Text>
            ) : null}
            {!moduleName && manages.length === 0 && views.length === 0 ? (
              <Text variant="caption" className="text-foreground-secondary">
                {t('screens.users.role-only-own')}
              </Text>
            ) : null}
          </View>
        );
      })}
    </Panel>
  );
}
