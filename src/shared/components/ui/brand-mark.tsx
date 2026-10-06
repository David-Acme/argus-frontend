import { View } from 'react-native';
import { cn } from '@/shared/libs/utils';

type BrandMarkProps = {
  size?: 'md' | 'lg';
  className?: string;
};

export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  const large = size === 'lg';
  return (
    <View
      className={cn(
        'bg-interactive items-center justify-center rounded-4xl shadow-lg shadow-black/10',
        large ? 'size-28' : 'size-24',
        className
      )}>
      <View
        className={cn(
          'border-foreground-on-interactive items-center justify-center rounded-full border-[3px]',
          large ? 'size-14' : 'size-12'
        )}>
        <View className={cn('bg-foreground-on-interactive absolute size-1.5 rounded-full', large ? 'left-3' : 'left-2.5')} />
        <View className={cn('bg-foreground-on-interactive absolute size-1.5 rounded-full', large ? 'right-3' : 'right-2.5')} />
      </View>
    </View>
  );
}
