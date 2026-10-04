import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type CameraFrameRateProps = {
  measuredFps: number;
};

export function CameraFrameRate({ measuredFps }: CameraFrameRateProps) {
  const { t } = useTranslation();
  if (measuredFps <= 0) return null;
  return <Text variant="caption">{t('screens.cameras.live.frame-rate-fixed', { fps: String(measuredFps) })}</Text>;
}
