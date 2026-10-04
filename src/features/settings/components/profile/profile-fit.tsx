import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import type { ProfileFit as ProfileFitText } from '@/features/settings/model/profile-text';

type ProfileFitProps = {
  fit: ProfileFitText;
};

export function ProfileFit({ fit }: ProfileFitProps) {
  return (
    <View
      className={cn(
        'gap-1 rounded-2xl px-3 py-2.5',
        fit.recommended ? 'bg-accent-soft' : 'bg-surface-secondary dark:bg-card-secondary'
      )}>
      <View className="flex-row items-center gap-1.5">
        <Icon
          name={fit.recommended ? 'sparkles' : 'monitor'}
          className={cn(
            'size-3.5',
            fit.recommended ? 'text-accent-strong' : 'text-foreground-secondary'
          )}
        />
        <Text
          variant="label"
          className={cn('flex-1', fit.recommended ? 'text-accent-strong' : 'text-foreground')}>
          {fit.title}
        </Text>
      </View>
      {fit.detail ? (
        <Text variant="caption" className="text-foreground-secondary">
          {fit.detail}
        </Text>
      ) : null}
    </View>
  );
}
