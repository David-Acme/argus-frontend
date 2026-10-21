import { Circle, Path, Rect, Svg } from 'react-native-svg';
import { size as sizes, useThemeTokens, type ColorRole } from '@/shared/theme';
import { ICON_SHAPES, type IconGlyph, type IconShape } from './icon-shapes';

export type IconTone = Extract<
  ColorRole,
  'text' | 'text-2' | 'text-3' | 'accent' | 'ok' | 'attn' | 'alert' | 'on-ink'
>;

export type IconProps = {
  name: IconGlyph;
  size?: 'small' | 'default';
  tone?: IconTone;
  label?: string;
};

type ShapeProps = { shape: IconShape };

const PIXELS = { small: sizes.iconSmall, default: sizes.icon } as const;

function Shape({ shape }: ShapeProps) {
  if ('d' in shape) return <Path d={shape.d} />;
  if ('r' in shape) return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} />;
  return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
}

export function Icon({ name, size = 'default', tone = 'text', label }: IconProps) {
  const { color } = useThemeTokens();
  const pixels = PIXELS[size];
  return (
    <Svg
      width={pixels}
      height={pixels}
      viewBox={`0 0 ${sizes.icon} ${sizes.icon}`}
      fill="none"
      stroke={color[tone]}
      strokeWidth={sizes.iconStroke}
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
