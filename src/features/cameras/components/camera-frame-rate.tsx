import { View } from 'react-native';
import type { ICameraVideoProfile } from '@/core/interfaces';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { frameRateChoices } from '@/features/cameras/model/camera-stream-quality';

type CameraFrameRateProps = {
  video: ICameraVideoProfile | null;
  measuredFps: number;
  canChange: boolean;
  onChange: (fps: number) => void;
};

export function CameraFrameRate({ video, measuredFps, canChange, onChange }: CameraFrameRateProps) {
  const { t } = useTranslation();
  const choices = frameRateChoices(video);
  const current = video?.frameRate || measuredFps;

  if (canChange && choices.length > 1 && video) {
    return (
      <View className="gap-1.5">
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text variant="label">{t('screens.cameras.live.frame-rate')}</Text>
          <View className="min-w-[240px]">
            <SegmentedControl
              accessibilityLabel={t('screens.cameras.live.frame-rate')}
              value={String(video.frameRate)}
              onChange={(value) => onChange(Number(value))}
              options={choices.map((fps) => ({
                value: String(fps),
                label: t('screens.cameras.live.frame-rate-option', { fps: String(fps) }),
              }))}
            />
          </View>
        </View>
        <Text variant="caption">{t('screens.cameras.live.frame-rate-hint')}</Text>
      </View>
    );
  }

  if (current <= 0) return null;
  return (
    <Text variant="caption">
      {choices.length > 1
        ? t('screens.cameras.live.frame-rate-owner', { fps: String(current) })
        : t('screens.cameras.live.frame-rate-fixed', { fps: String(current) })}
    </Text>
  );
}
