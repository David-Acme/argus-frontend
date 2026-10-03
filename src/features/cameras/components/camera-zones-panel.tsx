import { View } from 'react-native';
import type { IZoneCacheRow } from '@/core/interfaces';
import type { ZoneType } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { ZoneRow } from '@/features/cameras/components/zone-row';

type CameraZonesPanelProps = {
  zones: readonly IZoneCacheRow[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isPending: (zone: IZoneCacheRow) => boolean;
  onCreate: () => void;
  onEdit: (zoneId: string) => void;
  onDelete: (zone: IZoneCacheRow) => void;
  className?: string;
};

export function CameraZonesPanel({
  zones,
  canCreate,
  canEdit,
  canDelete,
  isPending,
  onCreate,
  onEdit,
  onDelete,
  className,
}: CameraZonesPanelProps) {
  const { t } = useTranslation();
  const typeLabels: Record<ZoneType, string> = {
    monitor: t('screens.cameras.zone-monitor'),
    alert: t('screens.cameras.zone-alert'),
    exclude: t('screens.cameras.zone-exclude'),
  };

  return (
    <Panel
      title={t('screens.cameras.zones')}
      count={zones.length}
      className={className}
      action={
        canCreate && zones.length > 0 ? (
          <Button variant="outline" size="sm" onPress={onCreate}>
            <Icon name="plus" className="text-foreground size-4" />
            <Text>{t('screens.cameras.add-zone')}</Text>
          </Button>
        ) : null
      }>
      {zones.length === 0 ? (
        <EmptyState
          variant="panel"
          icon="shield"
          title={t('screens.cameras.zones-empty')}
          hint={t('screens.cameras.zones-empty-hint')}
          className="flex-1"
          action={
            canCreate ? (
              <Button variant="outline" onPress={onCreate}>
                <Text>{t('screens.cameras.add-zone')}</Text>
              </Button>
            ) : null
          }
        />
      ) : (
        <View className="gap-2">
          {zones.map((zone) => {
            const pending = isPending(zone);
            return (
              <View key={zone.id} className={cn('flex-row items-center gap-2', pending && 'opacity-60')}>
                <View className="min-w-0 flex-1">
                  <ZoneRow
                    id={zone.id}
                    name={zone.name}
                    typeLabel={typeLabels[zone.zoneType] ?? zone.zoneType}
                    pointsLabel={
                      pending
                        ? t('screens.cameras.zone-pending')
                        : t('screens.cameras.zone-points-count', { count: String(zone.points.length) })
                    }
                    color={zone.color}
                    onPress={canEdit && !pending ? onEdit : undefined}
                  />
                </View>
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={pending}
                    accessibilityLabel={t('screens.cameras.delete-zone')}
                    onPress={() => onDelete(zone)}>
                    <Icon name="trash" className="text-error-strong size-4" />
                  </Button>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Panel>
  );
}
