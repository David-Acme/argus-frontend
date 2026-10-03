import { memo } from 'react';
import { Pressable, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { CameraDriverKind, CameraRecordMode, TranslationKey } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { StatusBadge } from '@/shared/components/ui/status-badge';

export type CameraCardStatus = 'online' | 'offline' | 'disabled';

type CameraCardProps = {
  item: ICameraCacheRow;
  onPress: (id: string) => void;
};

const PREVIEW_ASPECT = 16 / 9;

const DRIVER_LABEL = {
  tapo: 'screens.cameras.driver-tapo',
  onvif: 'screens.cameras.driver-onvif',
  rtsp: 'screens.cameras.driver-rtsp',
} as const satisfies Record<CameraDriverKind, TranslationKey>;

const RECORD_LABEL = {
  events: 'screens.cameras.form.record-events',
  continuous: 'screens.cameras.form.record-continuous',
} as const satisfies Record<CameraRecordMode, TranslationKey>;

const STATUS_LABEL = {
  online: 'screens.cameras.status.online',
  offline: 'screens.cameras.status.offline',
  disabled: 'screens.cameras.status.disabled',
} as const satisfies Record<CameraCardStatus, TranslationKey>;

const PREVIEW_LABEL = {
  online: 'screens.cameras.preview-hint',
  offline: 'screens.cameras.preview-offline',
  disabled: 'screens.cameras.preview-disabled',
} as const satisfies Record<CameraCardStatus, TranslationKey>;

const STATUS_DOT: Record<CameraCardStatus, string> = {
  online: 'bg-success',
  offline: 'bg-error',
  disabled: 'bg-muted-foreground',
};

const STATUS_TEXT: Record<CameraCardStatus, string> = {
  online: 'text-success',
  offline: 'text-error-strong',
  disabled: 'text-muted-foreground',
};

export function cameraStatusOf(item: Pick<ICameraCacheRow, 'isEnabled' | 'isOnline'>): CameraCardStatus {
  if (!item.isEnabled) return 'disabled';
  return item.isOnline ? 'online' : 'offline';
}

export const CameraCard = memo(function CameraCard({ item, onPress }: CameraCardProps) {
  const { t } = useTranslation();
  const status = cameraStatusOf(item);
  const statusLabel = t(STATUS_LABEL[status]);
  const subtitle = [item.modelLabel, t(DRIVER_LABEL[item.driver])]
    .filter(Boolean)
    .join(' · ');
  const zonesLabel =
    item.zones.length === 1
      ? t('screens.cameras.zones-count-one')
      : t('screens.cameras.zones-count', { count: String(item.zones.length) });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${statusLabel}`}
      onPress={() => onPress(item.id)}
      className="bg-card flex-1 gap-3 rounded-3xl p-3 shadow-md shadow-black/[0.05] active:opacity-80 web:hover:opacity-95">
      <View
        className="bg-surface-secondary w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl"
        style={{ aspectRatio: PREVIEW_ASPECT }}>
        <View className="bg-card size-14 items-center justify-center rounded-full shadow-sm shadow-black/[0.05]">
          <Icon
            name={status === 'online' ? item.icon : 'wifi-off'}
            className={cn(
              'size-6',
              status === 'online' ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
        </View>
        <Text variant="micro" numberOfLines={1}>
          {t(PREVIEW_LABEL[status])}
        </Text>
        <StatusBadge
          label={statusLabel}
          surface="card"
          dotClassName={STATUS_DOT[status]}
          className="absolute left-3 top-3"
          textClassName={STATUS_TEXT[status]}
        />
      </View>
      <View className="gap-0.5 px-1">
        <Text variant="subhead" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {subtitle || t('screens.cameras.device')}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Icon name="wifi" className="text-muted-foreground size-3.5" />
          <Text variant="caption" numberOfLines={1}>
            {item.ip}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2 px-1 pb-1">
        <StatusBadge icon="video" label={t(RECORD_LABEL[item.recordMode])} />
        <StatusBadge icon="shield" label={zonesLabel} />
      </View>
    </Pressable>
  );
});
