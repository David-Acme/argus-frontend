import { clsx } from 'clsx';
import { size, useEffects, useThemeTokens } from '@/shared/theme';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text, type TextTone } from '@/shared/ui/text';
import { useSingleFlight, type FlightAction } from './use-single-flight';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type TextButtonProps = {
  label: string;
  onPress: FlightAction;
  variant?: ButtonVariant;
  icon?: IconGlyph;
  compact?: boolean;
  block?: boolean;
  glass?: boolean;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
};

export type IconButtonProps = {
  iconOnly: true;
  icon: IconGlyph;
  label: string;
  onPress: FlightAction;
  iconSize?: 'small' | 'default';
  filled?: boolean;
  glass?: boolean;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
};

export type ButtonProps = TextButtonProps | IconButtonProps;

type Ink = { surface: string; text: TextTone; icon: IconTone };

const INK: Record<ButtonVariant, Ink> = {
  primary: { surface: 'bg-ink', text: 'on-ink', icon: 'on-ink' },
  secondary: { surface: 'bg-fill', text: 'default', icon: 'text' },
  ghost: { surface: 'bg-transparent', text: 'default', icon: 'text' },
  danger: { surface: 'bg-alert-soft', text: 'alert', icon: 'alert' },
};

const COMPACT_SLOP = (size.target - size.buttonCompact) / 2;

const ICON_SLOP = (size.target - size.targetMin) / 2;

function frameClass(compact: boolean | undefined, variant: ButtonVariant): string {
  if (compact) return 'min-h-button-compact rounded-control px-button-compact-x';
  return variant === 'ghost'
    ? 'min-h-button rounded-button px-button-ghost-x'
    : 'min-h-button rounded-button px-button-x';
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
  filled,
  glass,
  busy = false,
  disabled,
  testID,
}: IconButtonProps) {
  const flight = useSingleFlight(onPress, busy);
  const material = useGlass(glass);
  return (
    <PressableSurface
      a11y={{ label, role: 'button', busy: flight.busy }}
      onPress={flight.run}
      pressed={{ scale: 'icon', fill: true }}
      disabled={disabled || flight.busy}
      hitSlop={ICON_SLOP}
      testID={testID}
      style={material ? { boxShadow: material.elevation.glassInset } : undefined}
      className={clsx(
        'size-target-min items-center justify-center rounded-full',
        filled && 'bg-fill',
        material && (material.solid ? 'bg-surface' : 'web:backdrop-blur-control bg-glass')
      )}>
      <Icon name={icon} size={iconSize} />
    </PressableSurface>
  );
}

function TextButton({
  label,
  onPress,
  variant = 'secondary',
  icon,
  compact,
  block,
  glass,
  busy = false,
  disabled,
  testID,
}: TextButtonProps) {
  const flight = useSingleFlight(onPress, busy);
  const material = useGlass(glass);
  const ink = INK[variant];
  return (
    <PressableSurface
      a11y={{ label, role: 'button', busy: flight.busy }}
      onPress={flight.run}
      pressed={{ scale: 'surface' }}
      disabled={disabled || flight.busy}
      hitSlop={compact ? COMPACT_SLOP : undefined}
      testID={testID}
      style={material ? { boxShadow: material.elevation.glass } : undefined}
      className={clsx(
        'web:hover-dim flex-row items-center justify-center gap-2',
        frameClass(compact, variant),
        material ? (material.solid ? 'bg-surface' : 'web:glass-control bg-glass') : ink.surface,
        block && 'w-full'
      )}>
      {icon ? <Icon name={icon} size="small" tone={ink.icon} /> : null}
      <Text variant={compact ? 'buttonCompact' : 'button'} tone={ink.text}>
        {label}
      </Text>
    </PressableSurface>
  );
}

export function Button(props: ButtonProps) {
  if ('iconOnly' in props) return <IconButton {...props} />;
  return <TextButton {...props} />;
}
