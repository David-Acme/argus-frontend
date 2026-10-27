import { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import {
  Lens,
  NO_FILL,
  STROKE,
  Spotlight,
  roundRect,
} from '@/features/cameras/components/camera-illustration-parts';
import type { ShapeProps } from '@/features/cameras/components/camera-illustration-parts';

const TURRET_RIM = 'M30 66 Q60 54 90 66';
const DOME_SHELL = 'M28 28 A32 32 0 0 0 92 28 Z';
const DOME_GLASS = 'M40 28 A20 20 0 0 0 80 28';
const PTZ_HEAD = 'M36 40 A24 24 0 0 0 84 40 Z';

export function Turret({ palette, look }: ShapeProps) {
  return (
    <G>
      <Ellipse
        cx={60}
        cy={72}
        rx={36}
        ry={9}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Circle
        cx={60}
        cy={46}
        r={24}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={TURRET_RIM}
        fill={NO_FILL}
        stroke={palette.line}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Lens palette={palette} x={56} y={44} radius={8} />
      {look.spotlight ? <Spotlight palette={palette} x={49} y={28} width={14} /> : null}
    </G>
  );
}

export function Dome({ palette }: ShapeProps) {
  return (
    <G>
      <Path
        d={roundRect({ left: 22, top: 16, width: 76, height: 12, radius: 6 })}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={DOME_SHELL}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path d={DOME_GLASS} fill={palette.face} stroke={palette.ring} strokeWidth={STROKE} />
      <Circle
        cx={60}
        cy={40}
        r={5}
        fill={palette.glass}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Circle cx={58} cy={38} r={1.6} fill={palette.shine} />
    </G>
  );
}

export function Ptz({ palette }: ShapeProps) {
  return (
    <G>
      <Path
        d={roundRect({ left: 30, top: 8, width: 60, height: 10, radius: 5 })}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={roundRect({ left: 38, top: 18, width: 44, height: 22, radius: 6 })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={PTZ_HEAD}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path
        d={roundRect({ left: 50, top: 46, width: 20, height: 14, radius: 7 })}
        fill={palette.face}
      />
      <Lens palette={palette} x={60} y={53} radius={4} />
      <Line x1={38} y1={29} x2={82} y2={29} stroke={palette.line} strokeWidth={1} />
    </G>
  );
}

export function Doorbell({ palette, look }: ShapeProps) {
  const width = 36 * look.width;
  const height = 78 * look.height;
  const left = 60 - width / 2;
  const top = 45 - height / 2;
  return (
    <G>
      <Path
        d={roundRect({ left: left, top: top, width: width, height: height, radius: width * 0.42 })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={roundRect({
          left: left + 5,
          top: top + 6,
          width: width - 10,
          height: height * 0.32,
          radius: (width - 10) * 0.45,
        })}
        fill={palette.face}
      />
      <Lens palette={palette} x={60} y={top + 6 + height * 0.16} radius={5} />
      <Line
        x1={52}
        y1={top + height * 0.52}
        x2={68}
        y2={top + height * 0.52}
        stroke={palette.line}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <Circle
        cx={60}
        cy={top + height * 0.78}
        r={8}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Circle
        cx={60}
        cy={top + height * 0.78}
        r={4.5}
        fill={NO_FILL}
        stroke={palette.ring}
        strokeWidth={STROKE}
      />
    </G>
  );
}
