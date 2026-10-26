import { clsx } from 'clsx';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { Text, type TextTone } from '@/shared/ui/text';

export type AvatarTone = 'default' | 'accent' | 'ok' | 'attn' | 'alert' | 'event';

export type AvatarSize = 'mark' | 'small' | 'default' | 'large';

export type AvatarProps = {
  label?: string;
  initial?: string;
  icon?: IconGlyph;
  portrait?: ImageSourcePropType;
  tone?: AvatarTone;
  round?: boolean;
  size?: AvatarSize;
};

type Ink = { surface: string; text: TextTone; icon: IconTone };

const INK: Record<AvatarTone, Ink> = {
  default: { surface: 'bg-fill', text: 'accent', icon: 'accent' },
  accent: { surface: 'bg-accent-soft', text: 'accent', icon: 'accent' },
  ok: { surface: 'bg-ok-soft', text: 'ok', icon: 'ok' },
  attn: { surface: 'bg-attn-soft', text: 'attn', icon: 'attn' },
  alert: { surface: 'bg-alert-soft', text: 'alert', icon: 'alert' },
  event: { surface: 'bg-ev1', text: 'default', icon: 'ev1-text' },
};

const FRAME: Record<AvatarSize, string> = {
  mark: 'size-event-mark',
  small: 'size-well-small',
  default: 'size-well',
  large: 'size-avatar-large',
};

const CORNER: Record<AvatarSize, string> = {
  mark: 'rounded-sm',
  small: 'rounded-seg-inner',
  default: 'rounded-well',
  large: 'rounded-well',
};

export function Avatar({
  label,
  initial,
  icon,
  portrait,
  tone = 'default',
  round,
  size = 'default',
}: AvatarProps) {
  const ink = INK[tone];
  return (
    <View
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx(
        'items-center justify-center overflow-hidden',
        FRAME[size],
        round ? 'rounded-full' : CORNER[size],
        ink.surface
      )}>
      {portrait ? <Image source={portrait} className="size-full" /> : null}
      {!portrait && icon ? <Icon name={icon} size="small" tone={ink.icon} /> : null}
      {!portrait && !icon && initial ? (
        <Text variant={size === 'large' ? 'initialLarge' : 'initial'} tone={ink.text}>
          {initial}
        </Text>
      ) : null}
    </View>
  );
}
