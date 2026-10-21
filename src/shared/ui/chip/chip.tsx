import { clsx } from 'clsx';
import { View } from 'react-native';
import { size as sizes, useEffects, useThemeTokens } from '@/shared/theme';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text, type TextTone } from '@/shared/ui/text';

export type ChipTone = 'default' | 'ok' | 'attn' | 'alert';

export type ChipSize = 'tag' | 'stat' | 'suggestion';

export type TagChipProps = {
  label: string;
  tone?: ChipTone;
  dot?: boolean;
  icon?: IconGlyph;
  value?: string;
  size?: ChipSize;
};

export type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconGlyph;
  size?: ChipSize;
  testID?: string;
};

type ChipBodyProps = Omit<TagChipProps, 'size'> & { textTone: TextTone; iconTone: IconTone };

const TONE: Record<ChipTone, { surface: string; text: TextTone }> = {
  default: { surface: 'bg-fill', text: '2' },
  ok: { surface: 'bg-ok-soft', text: 'ok' },
  attn: { surface: 'bg-attn-soft', text: 'attn' },
  alert: { surface: 'bg-alert-soft', text: 'alert' },
};

const HEIGHT: Record<ChipSize, string> = {
  tag: 'min-h-chip px-chip-x',
  stat: 'min-h-chip-stat px-chip-stat-x',
  suggestion: 'min-h-chip-suggestion px-chip-x',
};

const DOT_TONE: Record<TextTone, string> = {
  default: 'bg-text',
  '2': 'bg-text-2',
  '3': 'bg-text-3',
  ok: 'bg-ok',
  attn: 'bg-attn',
  alert: 'bg-alert',
  accent: 'bg-accent',
  'on-ink': 'bg-on-ink',
  'on-media': 'bg-on-media',
};

const ICON_TONE: Record<TextTone, IconTone> = {
  default: 'text',
  '2': 'text-2',
  '3': 'text-3',
  ok: 'ok',
  attn: 'attn',
  alert: 'alert',
  accent: 'accent',
  'on-ink': 'on-ink',
  'on-media': 'on-media',
};

const FILTER_SLOP: Record<ChipSize, number> = {
  tag: (sizes.target - sizes.chip) / 2,
  stat: (sizes.target - sizes.chipStat) / 2,
  suggestion: (sizes.target - sizes.chipSuggestion) / 2,
};

type SizeSurface = {
  className: string;
  style?: { boxShadow: string };
  textTone: TextTone;
  iconTone: IconTone;
};

function useSizeSurface(chipSize: ChipSize, tone: ChipTone): SizeSurface {
  const { reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  if (chipSize === 'suggestion')
    return {
      className: 'bg-surface',
      style: { boxShadow: elevation.ring },
      textTone: 'default',
      iconTone: 'text',
    };
  if (chipSize === 'tag')
    return {
      className: TONE[tone].surface,
      textTone: TONE[tone].text,
      iconTone: ICON_TONE[TONE[tone].text],
    };
  const textTone = tone === 'default' ? 'default' : TONE[tone].text;
  return {
    className: reduceTransparency ? 'bg-surface' : 'web:backdrop-blur-chip bg-glass',
    style: { boxShadow: elevation.glassInset },
    textTone,
    iconTone: 'accent',
  };
}

function ChipBody({ label, dot, icon, value, textTone, iconTone }: ChipBodyProps) {
  return (
    <>
      {dot ? <View className={clsx('size-dot rounded-full', DOT_TONE[textTone])} /> : null}
      {icon ? <Icon name={icon} size="small" tone={iconTone} /> : null}
      {value ? (
        <Text variant="chipValue" tone={textTone}>
          {value}
        </Text>
      ) : null}
      <Text variant="chip" tone={textTone} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
}

export function Chip({ label, tone = 'default', dot, icon, value, size = 'tag' }: TagChipProps) {
  const surface = useSizeSurface(size, tone);
  return (
    <View
      className={clsx(
        'gap-chip-gap flex-row items-center self-start rounded-full',
        HEIGHT[size],
        surface.className
      )}
      style={surface.style}>
      <ChipBody
        label={label}
        dot={dot}
        icon={icon}
        value={value}
        textTone={surface.textTone}
        iconTone={surface.iconTone}
      />
    </View>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
  icon,
  size = 'tag',
  testID,
}: FilterChipProps) {
  const surface = useSizeSurface(size, 'default');
  return (
    <PressableSurface
      a11y={{ label, role: 'checkbox', checked: selected }}
      onPress={onPress}
      haptic="selection"
      pressed={{ scale: 'surface' }}
      hitSlop={FILTER_SLOP[size]}
      testID={testID}
      style={selected ? undefined : surface.style}
      className={clsx(
        'gap-chip-gap flex-row items-center rounded-full',
        HEIGHT[size],
        selected ? 'bg-ink' : surface.className
      )}>
      <ChipBody
        label={label}
        icon={icon}
        textTone={selected ? 'on-ink' : surface.textTone}
        iconTone={selected ? 'on-ink' : surface.iconTone}
      />
    </PressableSurface>
  );
}
