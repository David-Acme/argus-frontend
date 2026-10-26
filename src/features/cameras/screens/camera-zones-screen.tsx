import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { ICameraCacheRow, IZoneCacheRow } from '@/core/interfaces';
import type { TranslationKey, ZoneType } from '@/core/types';
import { zoneService } from '@/core/services/zone.service';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ZoneSheet } from '@/features/cameras/components/zones/zone-sheet';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { CAMERA_LIST_HREF } from '@/features/cameras/constants/routes.constant';

type ZonesBodyProps = { camera: ICameraCacheRow; isPending: (zone: IZoneCacheRow) => boolean };

type ZoneRowProps = {
  zone: IZoneCacheRow;
  pending: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

const ZONE_TYPE = {
  monitor: 'screens.cameras.zone-monitor',
  alert: 'screens.cameras.zone-alert',
  exclude: 'screens.cameras.zone-exclude',
  privacy: 'screens.cameras.zone-privacy',
} as const satisfies Record<ZoneType, TranslationKey>;

function ZoneRow({ zone, pending, onEdit, onRemove }: ZoneRowProps) {
  const { t } = useTranslation();
  const { can } = useCapabilities();
  return (
    <Row
      leading={<Avatar icon="grid" tone={zone.isEnabled ? 'accent' : undefined} />}
      title={zone.name}
      meta={
        pending
          ? t('screens.cameras.zone-pending')
          : [
              t(ZONE_TYPE[zone.zoneType]),
              t('screens.cameras.zone-points-count', { count: String(zone.points.length) }),
            ].join(' · ')
      }
      trailing={
        can('zone', 'delete') && !pending ? (
          <Button
            iconOnly
            compact
            icon="x"
            label={t('screens.cameras.delete-zone-named', { name: zone.name })}
            onPress={onRemove}
          />
        ) : undefined
      }
      onPress={can('zone', 'update') && !pending ? onEdit : undefined}
    />
  );
}

function ZonesBody({ camera, isPending }: ZonesBodyProps) {
  const { t } = useTranslation();
  const { can } = useCapabilities();
  const [editing, setEditing] = useState<IZoneCacheRow | 'new' | null>(null);
  const zones = [...camera.zones].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
  const creatable = can('zone', 'create');
  const remove = (zone: IZoneCacheRow) =>
    void runOptimistic({
      confirm: {
        title: t('screens.cameras.delete-zone-confirm', { name: zone.name }),
        description: t('screens.cameras.delete-zone-body'),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      },
      intents: [{ table: 'zone', kind: 'delete', recordId: zone.id }],
      call: () => zoneService.remove(zone.id),
      success: t('screens.cameras.zone-removed'),
    });
  return (
    <>
      {zones.length === 0 ? (
        <Section variant="plain">
          <Notice
            icon="grid"
            title={t('screens.cameras.zones-empty')}
            body={t('screens.cameras.zones-empty-hint')}
            action={
              creatable
                ? {
                    label: t('screens.cameras.add-zone'),
                    primary: true,
                    onPress: () => setEditing('new'),
                  }
                : undefined
            }
          />
        </Section>
      ) : (
        <Section title={t('screens.cameras.zones')}>
          {zones.map((zone) => (
            <ZoneRow
              key={zone.id}
              zone={zone}
              pending={isPending(zone)}
              onEdit={() => setEditing(zone)}
              onRemove={() => remove(zone)}
            />
          ))}
          {creatable ? (
            <Row
              leading={<Avatar icon="plus" />}
              title={t('screens.cameras.add-zone')}
              meta={t('screens.cameras.zones-empty-hint')}
              chevron
              onPress={() => setEditing('new')}
            />
          ) : null}
        </Section>
      )}
      {editing ? (
        <ZoneSheet
          key={editing === 'new' ? 'new' : editing.id}
          cameraId={camera.id}
          zone={editing === 'new' ? null : editing}
          zones={camera.zones}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

export default function CameraZonesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cameras, isPendingZone } = useCameraRows();
  const camera = cameras.find((item) => item.id === id) ?? null;
  if (!camera) return <Redirect href={CAMERA_LIST_HREF} />;
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/cameras/${id}`));
  return (
    <Screen
      title={t('screens.cameras.zones')}
      meta={camera.name}
      back={{ label: t('common.back'), onPress: back }}>
      <ZonesBody camera={camera} isPending={isPendingZone} />
    </Screen>
  );
}
