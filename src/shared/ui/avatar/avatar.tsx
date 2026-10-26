import { clsx } from 'clsx';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { size as sizes } from '@/shared/theme';
import { Icon, type IconGlyph, type IconTone } from '@/shared/ui/icon';
import { Presence, type PresenceState } from '@/shared/ui/presence';
import { Text, type TextTone } from '@/shared/ui/text';

export type AvatarTone = 'default' | 'accent' | 'ok' | 'attn' | 'alert';

export type AvatarSize = 'small' | 'default' | 'large';

export type AvatarProps = {
  label?: string;
  initial?: string;
  icon?: IconGlyph;
  presence?: PresenceState;
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
};

const FRAME: Record<AvatarSize, string> = {
  small: 'size-well-small',
  default: 'size-well',
  large: 'size-avatar-large',
};

const CORNER: Record<AvatarSize, string> = {
  small: 'rounded-seg-inner',
  default: 'rounded-well',
  large: 'rounded-well',
};

type FaceProps = Pick<AvatarProps, 'initial' | 'icon' | 'presence' | 'portrait'> & {
  ink: Ink;
  large: boolean;
};

function Face({ initial, icon, presence, portrait, ink, large }: FaceProps) {
  if (portrait) return <Image source={portrait} className="size-full" />;
  if (presence) return <Presence state={presence} size={sizes.presenceAvatar} paused />;
  if (icon) return <Icon name={icon} size="small" tone={ink.icon} />;
  if (!initial) return null;
  return (
    <Text variant={large ? 'initialLarge' : 'initial'} tone={ink.text}>
      {initial}
    </Text>
  );
}

export function Avatar({
  label,
  initial,
  icon,
  presence,
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
      <Face
        initial={initial}
        icon={icon}
        presence={presence}
        portrait={portrait}
        ink={ink}
        large={size === 'large'}
      />
    </View>
  );
}
