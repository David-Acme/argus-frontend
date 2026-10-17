import { View } from 'react-native';
import type { ICameraRecordingState } from '@/core/interfaces';
import { recordingPaused } from '@/features/cameras/model/camera-recording';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type RecordingPausedBannerProps = {
  state: ICameraRecordingState | null;
  className?: string;
};

export function RecordingPausedBanner({ state, className }: RecordingPausedBannerProps) {
  const { t } = useTranslation();

  if (!state || !recordingPaused(state)) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={cn('bg-warning/15 flex-row items-start gap-2 rounded-2xl p-3', className)}>
      <Icon name="triangle-alert" className="text-warning-strong mt-0.5 size-4" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{t('screens.cameras.recording-paused')}</Text>
        <Text variant="caption">
          {t('screens.cameras.recording-paused-detail', { free: state.freeGb, min: state.minFreeGb })}
        </Text>
      </View>
    </View>
  );
}
