import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type CreateTileLayout = 'tile' | 'fill' | 'row';

type CreateTileProps = {
  label: string;
  hint?: string;
  onPress: () => void;
  layout?: CreateTileLayout;
  style?: StyleProp<ViewStyle>;
};

const SURFACE: Record<CreateTileLayout, string> = {
  tile: 'rounded-3xl items-center justify-center gap-3 px-6 py-8 web:hover:bg-card',
  fill: 'rounded-xl min-h-[140px] flex-1 items-center justify-center gap-3 px-4 py-6 web:hover:bg-surface-secondary/40',
  row: 'rounded-lg min-h-11 flex-row items-center gap-2 px-3 web:hover:bg-surface-secondary',
};

const BADGE: Record<CreateTileLayout, string> = { tile: 'size-12', fill: 'size-10', row: 'size-6' };

export function CreateTile({ label, hint, onPress, layout = 'tile', style }: CreateTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={style}
      className={cn('border-border border-2 border-dashed active:opacity-70', SURFACE[layout])}>
      <View className={cn('bg-surface-secondary items-center justify-center rounded-full', BADGE[layout])}>
        <Icon name="plus" className={cn('text-foreground-secondary', layout === 'row' ? 'size-3.5' : 'size-5')} />
      </View>
      <View className={cn('gap-1', layout !== 'row' && 'items-center')}>
        <Text
          variant={layout === 'tile' ? 'subhead' : 'label'}
          className="text-foreground-secondary text-center">
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" className="text-center" numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
