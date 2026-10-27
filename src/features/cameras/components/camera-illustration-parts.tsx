import { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import type { CameraLook, LookMount } from '@/features/cameras/model/camera-looks';

export type Palette = {
  line: string;
  body: string;
  shade: string;
  face: string;
  glass: string;
  ring: string;
  shine: string;
  glow: string;
};

export type ShapeProps = {
  palette: Palette;
  look: CameraLook;
};

type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
};

type LensProps = {
  palette: Palette;
  x: number;
  y: number;
  radius: number;
};

type AntennaProps = {
  palette: Palette;
  x: number;
  y: number;
  lean: number;
};

type SpotlightProps = {
  palette: Palette;
  x: number;
  y: number;
  width: number;
};

type MountProps = {
  palette: Palette;
  mount: LookMount;
  top: number;
};

export const STROKE = 2;

export const NO_FILL = 'none';

export function roundRect({ left, top, width, height, radius }: Box): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = left + width;
  const bottom = top + height;
  return [
    `M${left + r} ${top}`,
    `H${right - r}`,
    `A${r} ${r} 0 0 1 ${right} ${top + r}`,
    `V${bottom - r}`,
    `A${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H${left + r}`,
    `A${r} ${r} 0 0 1 ${left} ${bottom - r}`,
    `V${top + r}`,
    `A${r} ${r} 0 0 1 ${left + r} ${top}`,
    'Z',
  ].join(' ');
}

export function Lens({ palette, x, y, radius }: LensProps) {
  return (
    <G>
      <Circle
        cx={x}
        cy={y}
        r={radius + 3}
        fill={palette.face}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Circle
        cx={x}
        cy={y}
        r={radius}
        fill={palette.glass}
        stroke={palette.ring}
        strokeWidth={STROKE}
      />
      <Circle
        cx={x - radius * 0.35}
        cy={y - radius * 0.35}
        r={Math.max(1.4, radius * 0.22)}
        fill={palette.shine}
      />
    </G>
  );
}

export function Antenna({ palette, x, y, lean }: AntennaProps) {
  return (
    <G>
      <Line
        x1={x}
        y1={y}
        x2={x + lean}
        y2={y - 22}
        stroke={palette.line}
        strokeWidth={STROKE + 1.5}
        strokeLinecap="round"
      />
      <Circle
        cx={x}
        cy={y}
        r={2.5}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
    </G>
  );
}

export function Spotlight({ palette, x, y, width }: SpotlightProps) {
  return (
    <G>
      <Path
        d={roundRect({ left: x, top: y, width: width, height: 6, radius: 3 })}
        fill={palette.glow}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Line
        x1={x + 3}
        y1={y + 3}
        x2={x + width - 3}
        y2={y + 3}
        stroke={palette.shine}
        strokeWidth={1}
      />
    </G>
  );
}

export function Mount({ palette, mount, top }: MountProps) {
  if (mount === 'magnet')
    return (
      <G>
        <Path
          d={roundRect({ left: 56, top: top, width: 8, height: 78 - top, radius: 3 })}
          fill={palette.shade}
          stroke={palette.line}
          strokeWidth={STROKE}
        />
        <Ellipse
          cx={60}
          cy={80}
          rx={16}
          ry={4}
          fill={palette.body}
          stroke={palette.line}
          strokeWidth={STROKE}
        />
      </G>
    );
  return (
    <G>
      <Ellipse
        cx={60}
        cy={81}
        rx={20}
        ry={4.5}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={roundRect({ left: 54, top: top, width: 12, height: 80 - top, radius: 3 })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
    </G>
  );
}
