import { memo, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import type { IZoneCacheRow } from '@/core/interfaces';
import type { ZoneType } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
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
  fill?: boolean;
};

type ZoneListItemProps = {
  zone: IZoneCacheRow;
  typeLabel: string;
  pointsLabel: string;
  pending: boolean;
  deleteLabel: string;
  onEdit?: (zoneId: string) => void;
  onDelete?: (zone: IZoneCacheRow) => void;
};

const ZONE_ROW_HEIGHT = 64;
const ZONE_ROW_GAP = 8;
const ZONE_LIST_MAX_HEIGHT = 440;

const zoneKey = (zone: IZoneCacheRow) => zone.id;

const ZoneListItem = memo(function ZoneListItem({
  zone,
  typeLabel,
  pointsLabel,
  pending,
  deleteLabel,
  onEdit,
  onDelete,
}: ZoneListItemProps) {
  return (
    <View className={cn('flex-row items-center gap-2', pending && 'opacity-60')}>
      <View className="min-w-0 flex-1">
        <ZoneRow
          id={zone.id}
          name={zone.name}
          typeLabel={typeLabel}
          pointsLabel={pointsLabel}
          color={zone.color}
          onPress={pending ? undefined : onEdit}
        />
      </View>
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          accessibilityLabel={deleteLabel}
          onPress={() => onDelete(zone)}>
          <Icon name="trash" className="text-error-strong size-4" />
        </Button>
      ) : null}
    </View>
  );
});

export function CameraZonesPanel({
  zones,
  canCreate,
  canEdit,
  canDelete,
  isPending,
  onCreate,
  onEdit,
  onDelete,
  fill = false,
}: CameraZonesPanelProps) {
  const { t } = useTranslation();
  const ordered = useMemo(
    () =>
      [...zones].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      ),
    [zones]
  );
  const typeLabels = useMemo<Record<ZoneType, string>>(
    () => ({
      monitor: t('screens.cameras.zone-monitor'),
      alert: t('screens.cameras.zone-alert'),
      exclude: t('screens.cameras.zone-exclude'),
      privacy: t('screens.cameras.zone-privacy'),
    }),
    [t]
  );

  const renderZone = useCallback(
    (zone: IZoneCacheRow) => {
      const pending = isPending(zone);
      return (
        <ZoneListItem
          zone={zone}
          typeLabel={typeLabels[zone.zoneType] ?? zone.zoneType}
          pointsLabel={
            pending
              ? t('screens.cameras.zone-pending')
              : t('screens.cameras.zone-points-count', { count: String(zone.points.length) })
          }
          pending={pending}
          deleteLabel={t('screens.cameras.delete-zone')}
          onEdit={canEdit ? onEdit : undefined}
          onDelete={canDelete ? onDelete : undefined}
        />
      );
    },
    [canDelete, canEdit, isPending, onDelete, onEdit, t, typeLabels]
  );

  return (
    <Panel
      title={t('screens.cameras.zones')}
      count={zones.length}
      className={fill ? 'min-h-72 flex-1 basis-0' : undefined}
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
        <InfiniteList
          data={ordered}
          keyOf={zoneKey}
          renderItem={renderZone}
          estimatedItemSize={ZONE_ROW_HEIGHT}
          gap={ZONE_ROW_GAP}
          maxHeight={fill ? undefined : ZONE_LIST_MAX_HEIGHT}
          scrollIndicator
          recycle
        />
      )}
    </Panel>
  );
}
