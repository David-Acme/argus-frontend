import { View } from 'react-native';
import { t as translate } from '@/core/i18n';
import { cameraService } from '@/core/services/camera.service';
import type { GuardMaskedCamera } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runServiceAction } from '@/shared/libs/service-action';
import { cn } from '@/shared/libs/utils';

type MaskedCamerasNoticeProps = {
  cameras: readonly GuardMaskedCamera[];
  canUnmask: boolean;
  onUnmasked?: () => void;
  className?: string;
};

async function unmaskCamera(camera: GuardMaskedCamera): Promise<boolean> {
  const result = await runServiceAction({
    confirm: {
      title: translate('screens.security.mask.unmask-title'),
      description: translate('screens.security.mask.unmask-body', { name: camera.name }),
      intent: 'warning',
    },
    call: () => cameraService.settings(String(camera.cameraId), { privacy: false }),
    success: translate('screens.security.mask.unmasked', { name: camera.name }),
    errorTitle: translate('screens.cameras.device-refused'),
  });
  return result !== null;
}

export function MaskedCamerasNotice({
  cameras,
  canUnmask,
  onUnmasked,
  className,
}: MaskedCamerasNoticeProps) {
  const { t } = useTranslation();

  if (cameras.length === 0) return null;

  return (
    <View accessibilityRole="alert" className={cn('bg-warning/15 gap-2 rounded-2xl p-3', className)}>
      <View className="flex-row items-start gap-2">
        <Icon name="eye-off" className="text-warning-strong mt-0.5 size-4" />
        <Text variant="caption" className="min-w-0 flex-1">
          {t('screens.security.mask.title')}
        </Text>
      </View>
      {cameras.map((camera) => (
        <View key={camera.cameraId} className="flex-row items-center gap-2">
          <Text variant="caption" numberOfLines={1} className="min-w-0 flex-1">
            {camera.name}
          </Text>
          {canUnmask ? (
            <Button
              variant="outline"
              size="sm"
              onPress={() => void unmaskCamera(camera).then((done) => (done ? onUnmasked?.() : undefined))}>
              <Text>{t('screens.security.mask.unmask')}</Text>
            </Button>
          ) : null}
        </View>
      ))}
    </View>
  );
}
