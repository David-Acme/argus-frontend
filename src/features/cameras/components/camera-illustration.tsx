import { useUniwind } from 'uniwind';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { CameraFormFactor } from '@/core/types';
import { colorTokens } from '@/shared/constants';

type CameraIllustrationProps = {
  formFactor: CameraFormFactor;
  size?: number;
  label?: string;
};

type Palette = {
  line: string;
  body: string;
  shade: string;
  glass: string;
  ring: string;
  shine: string;
};

type LensProps = {
  palette: Palette;
  x: number;
  y: number;
  radius: number;
};

type ShapeProps = {
  palette: Palette;
};

const STROKE = 2;

function Lens({ palette, x, y, radius }: LensProps) {
  return (
    <G>
      <Circle cx={x} cy={y} r={radius + 4} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Circle cx={x} cy={y} r={radius} fill={palette.glass} stroke={palette.ring} strokeWidth={STROKE} />
      <Circle cx={x - radius * 0.35} cy={y - radius * 0.35} r={Math.max(1.5, radius * 0.22)} fill={palette.shine} />
    </G>
  );
}

function PanTilt({ palette }: ShapeProps) {
  return (
    <G>
      <Ellipse cx={60} cy={80} rx={24} ry={5} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Path d="M50 79 L53 62 L67 62 L70 79" fill={palette.body} stroke={palette.line} strokeWidth={STROKE} strokeLinejoin="round" />
      <Circle cx={60} cy={36} r={27} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Path d="M35 30 Q60 18 85 30" fill="none" stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Lens palette={palette} x={60} y={40} radius={8} />
      <Circle cx={74} cy={52} r={1.8} fill={palette.ring} />
    </G>
  );
}

function OutdoorPanTilt({ palette }: ShapeProps) {
  return (
    <G>
      <Rect x={48} y={6} width={24} height={7} rx={2} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Line x1={60} y1={13} x2={60} y2={22} stroke={palette.line} strokeWidth={STROKE + 1} />
      <Line x1={34} y1={30} x2={26} y2={10} stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={86} y1={30} x2={94} y2={10} stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Rect x={30} y={22} width={60} height={26} rx={12} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Path d="M36 48 A24 24 0 0 0 84 48 Z" fill={palette.body} stroke={palette.line} strokeWidth={STROKE} strokeLinejoin="round" />
      <Lens palette={palette} x={60} y={58} radius={7} />
    </G>
  );
}

function Cube({ palette }: ShapeProps) {
  return (
    <G>
      <Ellipse cx={60} cy={81} rx={20} ry={4.5} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Rect x={54} y={64} width={12} height={16} rx={3} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Rect x={34} y={12} width={52} height={54} rx={16} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Lens palette={palette} x={60} y={36} radius={9} />
      <Circle cx={60} cy={56} r={1.8} fill={palette.ring} />
    </G>
  );
}

function Bullet({ palette }: ShapeProps) {
  return (
    <G>
      <Rect x={84} y={52} width={8} height={30} rx={2} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Path d="M88 60 L72 52" stroke={palette.line} strokeWidth={STROKE + 1} strokeLinecap="round" />
      <Path d="M18 24 L92 22" stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Rect x={22} y={26} width={66} height={26} rx={12} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Ellipse cx={26} cy={39} rx={7} ry={13} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Circle cx={26} cy={39} r={6} fill={palette.glass} stroke={palette.ring} strokeWidth={STROKE} />
      <Circle cx={24} cy={36.5} r={1.6} fill={palette.shine} />
    </G>
  );
}

function Turret({ palette }: ShapeProps) {
  return (
    <G>
      <Ellipse cx={60} cy={72} rx={36} ry={9} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Circle cx={60} cy={46} r={24} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Path d="M30 66 Q60 54 90 66" fill="none" stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Lens palette={palette} x={56} y={42} radius={8} />
    </G>
  );
}

function Dome({ palette }: ShapeProps) {
  return (
    <G>
      <Rect x={22} y={16} width={76} height={12} rx={6} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Path d="M28 28 A32 32 0 0 0 92 28 Z" fill={palette.body} stroke={palette.line} strokeWidth={STROKE} strokeLinejoin="round" />
      <Path d="M40 28 A20 20 0 0 0 80 28" fill={palette.glass} stroke={palette.ring} strokeWidth={STROKE} />
      <Circle cx={60} cy={40} r={5} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Circle cx={57} cy={37} r={1.6} fill={palette.shine} />
    </G>
  );
}

function Doorbell({ palette }: ShapeProps) {
  return (
    <G>
      <Rect x={42} y={6} width={36} height={78} rx={16} fill={palette.body} stroke={palette.line} strokeWidth={STROKE} />
      <Lens palette={palette} x={60} y={24} radius={6} />
      <Line x1={52} y1={44} x2={68} y2={44} stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Line x1={54} y1={49} x2={66} y2={49} stroke={palette.line} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={60} cy={67} r={9} fill={palette.shade} stroke={palette.line} strokeWidth={STROKE} />
      <Circle cx={60} cy={67} r={5} fill="none" stroke={palette.ring} strokeWidth={STROKE} />
    </G>
  );
}

const SHAPES: Record<CameraFormFactor, (props: ShapeProps) => React.JSX.Element> = {
  'pan-tilt': PanTilt,
  'outdoor-pan-tilt': OutdoorPanTilt,
  cube: Cube,
  bullet: Bullet,
  turret: Turret,
  dome: Dome,
  doorbell: Doorbell,
};

export function CameraIllustration({ formFactor, size = 96, label }: CameraIllustrationProps) {
  const { theme } = useUniwind();
  const tokens = colorTokens[theme === 'dark' ? 'dark' : 'light'];
  const palette: Palette = {
    line: tokens['foreground-secondary'],
    body: tokens.card,
    shade: tokens['surface-secondary'],
    glass: tokens.overlay,
    ring: tokens.accent,
    shine: tokens.surface,
  };
  const Shape = SHAPES[formFactor];

  return (
    <Svg
      width={size}
      height={(size * 90) / 120}
      viewBox="0 0 120 90"
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}>
      <Shape palette={palette} />
    </Svg>
  );
}
