import { View } from 'react-native';
import type { TableName, UserRole } from '@/core/types';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { peopleAccessForRole } from '@/shared/libs/people-access';
import { hasAccess } from '@/shared/libs/role-access';

type RoleAccessCardProps = {
  roleLabel: (role: UserRole) => string;
  counts: Partial<Record<UserRole, number>>;
};

type Area = 'cameras' | 'agenda' | 'projects' | 'activity';

const ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

const AREA_TABLES: readonly { area: Area; table: TableName }[] = [
  { area: 'cameras', table: 'camera' },
  { area: 'agenda', table: 'calendar_event' },
  { area: 'projects', table: 'project' },
  { area: 'activity', table: 'event' },
];

type AreaKey = `area-${Area | 'people' | 'security'}`;

function areasFor(role: UserRole): { manages: AreaKey[]; views: AreaKey[] } {
  const manages: AreaKey[] = [];
  const views: AreaKey[] = [];
  for (const { area, table } of AREA_TABLES) {
    if (hasAccess(role, table, 'create')) manages.push(`area-${area}`);
    else if (hasAccess(role, table, 'read')) views.push(`area-${area}`);
  }
  const people = peopleAccessForRole(role).profileAction;
  if (people === 'manage') manages.push('area-people');
  if (people === 'directory') views.push('area-people');
  if (role === 'owner') manages.push('area-security');
  return { manages, views };
}

export function RoleAccessCard({ roleLabel, counts }: RoleAccessCardProps) {
  const { t } = useTranslation();
  const list = (keys: readonly AreaKey[]) => keys.map((key) => t(`screens.users.${key}`)).join(', ');

  return (
    <Panel className="gap-0 py-2">
      {ROLES.map((role) => {
        const { manages, views } = areasFor(role);
        return (
          <View key={role} className="border-border-subtle gap-1 border-b py-3 last:border-b-0">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text className="font-semibold">{roleLabel(role)}</Text>
              <Text className="text-muted-foreground text-xs">
                {t('screens.users.role-members', { count: String(counts[role] ?? 0) })}
              </Text>
            </View>
            {manages.length > 0 ? (
              <Text className="text-foreground-secondary text-sm leading-5">
                {t('screens.users.role-manages')}: {list(manages)}
              </Text>
            ) : null}
            {views.length > 0 ? (
              <Text className="text-foreground-secondary text-sm leading-5">
                {t('screens.users.role-views')}: {list(views)}
              </Text>
            ) : null}
            {manages.length === 0 && views.length === 0 ? (
              <Text className="text-foreground-secondary text-sm leading-5">
                {t('screens.users.role-only-own')}
              </Text>
            ) : null}
          </View>
        );
      })}
    </Panel>
  );
}
