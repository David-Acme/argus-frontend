import { clsx } from 'clsx';
import { View } from 'react-native';
import { illustration, size as sizes, state } from '@/shared/theme';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type RoundTone = 'neutral' | 'on' | 'answer' | 'decline';

type RoundControlProps = {
  icon: IconGlyph;
  label: string;
  size: number;
  tone?: RoundTone;
  caption?: boolean;
  toggled?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const FILLS: Readonly<Record<RoundTone, string | undefined>> = {
  neutral: undefined,
  on: undefined,
  answer: illustration.call.answer,
  decline: illustration.call.decline,
};

const ICON_TONES: Readonly<Record<RoundTone, IconTone>> = {
  neutral: 'text',
  on: 'on-ink',
  answer: 'on-media',
  decline: 'on-media',
};

export function RoundControl({
  icon,
  label,
  size,
  tone = 'neutral',
  caption = false,
  toggled,
  disabled = false,
  onPress,
}: RoundControlProps) {
  const fill = FILLS[tone];
  const circle = {
    width: size,
    height: size,
    backgroundColor: fill,
    opacity: disabled ? state.disabledOpacity : 1,
  };
  return (
    <PressableSurface
      a11y={{ label, role: toggled === undefined ? 'button' : 'switch', checked: toggled }}
      onPress={onPress}
      disabled={disabled}
      haptic="impactLight"
      pressed={{ scale: 'icon' }}
      hitSlop={Math.max(0, (sizes.target - size) / 2)}
      className="items-center gap-2">
      <View
        className={clsx(
          'items-center justify-center rounded-full',
          tone === 'neutral' && 'bg-fill',
          tone === 'on' && 'bg-ink'
        )}
        style={circle}>
        <Icon name={icon} tone={ICON_TONES[tone]} fine />
      </View>
      {caption ? (
        <Text variant="caption" tone="2">
          {label}
        </Text>
      ) : null}
    </PressableSurface>
  );
}
