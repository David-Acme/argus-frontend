import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { CameraSightActivity } from '@/features/cameras/model/camera-aim';

type CameraSightBadgeProps = {
  activity: CameraSightActivity;
};

export function CameraSightBadge({ activity }: CameraSightBadgeProps) {
  const { t } = useTranslation();
  if (activity === null) return null;
  const label =
    activity === 'watching' ? t('screens.cameras.sight.watching') : t('screens.cameras.sight.returning');

  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      className="bg-card/90 flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
      <Icon
        name={activity === 'watching' ? 'scan-eye' : 'home'}
        className={activity === 'watching' ? 'text-accent-strong size-3.5' : 'text-foreground-secondary size-3.5'}
      />
      <Text variant="micro" className="text-foreground font-semibold">
        {label}
      </Text>
    </View>
  );
}
