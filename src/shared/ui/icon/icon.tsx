import { Circle, Path, Svg } from 'react-native-svg';
import { size as sizes, useThemeTokens } from '@/shared/theme';
import type { ColorRole } from '@/shared/theme';
import { ICON_SHAPES } from '@/shared/ui/icon/icon-shapes';
import type { IconGlyph, IconShape } from '@/shared/ui/icon/icon-shapes';

export type IconTone = Extract<
  ColorRole,
  | 'text'
  | 'text-2'
  | 'text-3'
  | 'accent'
  | 'ok'
  | 'attn'
  | 'alert'
  | 'on-ink'
  | 'on-media'
  | 'ev1-text'
  | 'ev2-text'
  | 'ev3-text'
  | 'receipt-read'
>;

export type IconProps = {
  name: IconGlyph;
  size?: 'meta' | 'small' | 'default' | 'large';
  tone?: IconTone;
  label?: string;
  fine?: boolean;
};

type ShapeProps = { shape: IconShape };

const PIXELS = {
  meta: sizes.iconMeta,
  small: sizes.iconSmall,
  default: sizes.icon,
  large: sizes.iconLarge,
} as const;

function Shape({ shape }: ShapeProps) {
  if ('d' in shape) return <Path d={shape.d} />;
  return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
}

export function Icon({ name, size = 'default', tone = 'text', label, fine = false }: IconProps) {
  const { color } = useThemeTokens();
  const pixels = PIXELS[size];
  return (
    <Svg
      width={pixels}
      height={pixels}
      viewBox={`0 0 ${sizes.icon} ${sizes.icon}`}
      fill="none"
      stroke={color[tone]}
      strokeWidth={fine ? sizes.iconStrokeFine : sizes.iconStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}>
      {ICON_SHAPES[name].map((shape, index) => (
        <Shape key={index} shape={shape} />
      ))}
    </Svg>
  );
}
