import { View } from 'react-native';
import type { DevicePermission, DevicePermissionId, IconName } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

const ICONS: Record<DevicePermissionId, IconName> = {
  microphone: 'mic',
  notifications: 'bell',
  'full-screen': 'lock',
  'exact-alarms': 'alarm-clock',
};

type PermissionListProps = {
  permissions: readonly DevicePermission[];
  onRequest: (id: DevicePermissionId) => void;
  density?: 'card' | 'compact';
};

export function PermissionList({ permissions, onRequest, density = 'card' }: PermissionListProps) {
  const { t } = useTranslation();
  return (
    <View className={density === 'card' ? 'gap-3' : 'gap-1'}>
      {permissions.map(({ id, granted }) => (
        <View
          key={id}
          className={cn(
            'flex-row items-center gap-3',
            density === 'card' ? 'bg-card border-border rounded-2xl border p-4' : 'min-h-11 py-1.5',
          )}>
          <View
            className={cn(
              'bg-accent-soft items-center justify-center',
              density === 'card' ? 'size-11 rounded-2xl' : 'size-9 rounded-xl',
            )}>
            <Icon name={ICONS[id]} className="text-accent-strong size-5" />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text variant="label">{t(`common.permissions.${id}`)}</Text>
            {density === 'card' ? (
              <Text variant="caption" className="text-foreground-secondary">
                {t(`common.permissions.${id}-detail`)}
              </Text>
            ) : null}
            <Text variant="micro" className={granted ? 'text-success' : 'text-warning-strong'}>
              {granted ? t('common.permissions.granted') : t('common.permissions.pending')}
            </Text>
          </View>
          {granted ? null : (
            <Button size="sm" onPress={() => onRequest(id)}>
              <Text>{t('common.permissions.allow')}</Text>
            </Button>
          )}
        </View>
      ))}
    </View>
  );
}
