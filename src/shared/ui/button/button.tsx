import { clsx } from 'clsx';
import { View } from 'react-native';
import { size, useEffects, useThemeTokens } from '@/shared/theme';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text, type TextTone } from '@/shared/ui/text';
import { HoldButton, type HoldButtonProps } from './hold-button';
import { useSingleFlight, type FlightAction } from './use-single-flight';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonTrailing = { icon: IconGlyph } | { key: string };

export type ButtonLabel = string | { shown: string; spoken: string };

export type TextButtonProps = {
  label: ButtonLabel;
  onPress: FlightAction;
  variant?: ButtonVariant;
  icon?: IconGlyph;
  trailing?: ButtonTrailing;
  compact?: boolean;
  block?: boolean;
  glass?: boolean;
  busy?: boolean;
  disabled?: boolean;
};

export type IconButtonProps = {
  iconOnly: true;
  icon: IconGlyph;
  label: string;
  onPress: FlightAction;
  iconSize?: 'small' | 'default';
  filled?: boolean;
  compact?: boolean;
  glass?: boolean;
  busy?: boolean;
  disabled?: boolean;
};

export type ButtonProps = TextButtonProps | IconButtonProps | HoldButtonProps;

type Ink = { surface: string; text: TextTone; icon: IconTone; edge: string };

const INK: Record<ButtonVariant, Ink> = {
  primary: { surface: 'bg-ink', text: 'on-ink', icon: 'on-ink', edge: 'border-on-ink' },
  secondary: { surface: 'bg-fill', text: 'default', icon: 'text', edge: 'border-text' },
  ghost: { surface: 'bg-transparent', text: 'default', icon: 'text', edge: 'border-text' },
  danger: { surface: 'bg-alert-soft', text: 'alert', icon: 'alert', edge: 'border-alert' },
};

const COMPACT_SLOP = (size.target - size.targetMin) / 2;

const ICON_SLOP = (size.target - size.targetMin) / 2;

const WELL_SLOP = (size.target - size.wellSmall) / 2;

function frameClass(compact: boolean | undefined, variant: ButtonVariant): string {
  if (compact) return 'min-h-button-compact rounded-control px-button-compact-x';
  return variant === 'ghost'
    ? 'min-h-button rounded-button px-button-ghost-x'
    : 'min-h-button rounded-button px-button-x';
}

function Trailing({ trailing, ink }: { trailing: ButtonTrailing; ink: Ink }) {
  if ('icon' in trailing) return <Icon name={trailing.icon} size="small" tone={ink.icon} />;
  return (
    <View
      aria-hidden
      className={clsx('rounded-key px-nav-key-x ml-1.5 border border-b-2 opacity-70', ink.edge)}>
      <Text variant="key" tone={ink.text}>
        {trailing.key}
      </Text>
    </View>
  );
}

function useGlass(glass: boolean | undefined) {
  const { reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  if (!glass) return null;
  return { solid: reduceTransparency, elevation };
}

function IconButton({
  icon,
  label,
  onPress,
  iconSize = 'default',
  compact,
  filled,
  glass,
  busy = false,
  disabled,
}: IconButtonProps) {
  const flight = useSingleFlight(onPress, busy);
  const material = useGlass(glass);
  return (
    <PressableSurface
      a11y={{ label, role: 'button', busy: flight.busy }}
      onPress={flight.run}
      pressed={{ scale: 'icon', fill: true }}
      disabled={disabled || flight.busy}
      hitSlop={compact ? WELL_SLOP : ICON_SLOP}
      style={material ? { boxShadow: material.elevation.glassInset } : undefined}
      className={clsx(
        compact ? 'size-well-small' : 'size-target-min',
        'items-center justify-center rounded-full',
        filled && 'bg-fill',
        material && (material.solid ? 'bg-surface' : 'web:backdrop-blur-control bg-glass')
      )}>
      <Icon name={icon} size={compact ? 'small' : iconSize} />
    </PressableSurface>
  );
}

type FaceInput = Pick<TextButtonProps, 'compact' | 'block' | 'glass'> & { variant: ButtonVariant };

function useFace({ variant, compact, block, glass }: FaceInput) {
  const material = useGlass(glass);
  const surface = material
    ? material.solid
      ? 'bg-surface'
      : 'web:glass-control bg-glass'
    : INK[variant].surface;
  return {
    className: clsx(
      'flex-row items-center justify-center gap-2',
      frameClass(compact, variant),
      surface,
      block && 'w-full'
    ),
    style: material ? { boxShadow: material.elevation.glass } : undefined,
  };
}

function TextButton({
  label,
  onPress,
  variant = 'secondary',
  icon,
  trailing,
  compact,
  block,
  glass,
  busy = false,
  disabled,
}: TextButtonProps) {
  const flight = useSingleFlight(onPress, busy);
  const ink = INK[variant];
  const face = useFace({ variant, compact, block, glass });
  const shown = typeof label === 'string' ? label : label.shown;
  const spoken = typeof label === 'string' ? label : label.spoken;
  const content = (
    <>
      {icon ? <Icon name={icon} size="small" tone={ink.icon} /> : null}
      <Text variant={compact ? 'buttonCompact' : 'button'} tone={ink.text}>
        {shown}
      </Text>
      {trailing ? <Trailing trailing={trailing} ink={ink} /> : null}
    </>
  );
  return (
    <PressableSurface
      a11y={{ label: spoken, role: 'button', busy: flight.busy }}
      onPress={flight.run}
      pressed={{ scale: 'surface' }}
      disabled={disabled || flight.busy}
      hitSlop={compact ? COMPACT_SLOP : undefined}
      style={compact ? undefined : face.style}
      className={clsx(
        'web:hover-dim',
        compact
          ? clsx('min-h-target-min -my-0.5 justify-center', block && 'w-full')
          : face.className
      )}>
      {compact ? (
        <View className={face.className} style={face.style}>
          {content}
        </View>
      ) : (
        content
      )}
    </PressableSurface>
  );
}

export function Button(props: ButtonProps) {
  if ('iconOnly' in props) return <IconButton {...props} />;
  if ('hold' in props) return <HoldButton {...props} />;
  return <TextButton {...props} />;
}
