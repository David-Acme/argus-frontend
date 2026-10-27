import { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import {
  Antenna,
  Lens,
  Mount,
  NO_FILL,
  STROKE,
  Spotlight,
  roundRect,
} from '@/features/cameras/components/camera-illustration-parts';
import type { ShapeProps } from '@/features/cameras/components/camera-illustration-parts';

const OUTDOOR_HEAD = 'M36 48 A24 24 0 0 0 84 48 Z';

type BulletMountProps = ShapeProps & { right: number; bottom: number };

export function Cube({ palette, look }: ShapeProps) {
  const width = 52 * look.width;
  const height = 54 * look.height;
  const neck = look.mount === 'magnet' ? 70 : 66;
  const top = Math.max(4, neck - height);
  const left = 60 - width / 2;
  const faceHeight = height * 0.58;
  const lensY = top + 5 + faceHeight / 2;
  return (
    <G>
      <Mount palette={palette} mount={look.mount} top={neck - 4} />
      <Path
        d={roundRect({
          left: left,
          top: top,
          width: width,
          height: height,
          radius: Math.min(width, height) * 0.3,
        })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      {look.visor ? (
        <Path
          d={roundRect({
            left: left + 5,
            top: top + 5,
            width: width - 10,
            height: faceHeight,
            radius: Math.min(width, faceHeight) * 0.3,
          })}
          fill={palette.face}
        />
      ) : null}
      <Lens palette={palette} x={60} y={lensY} radius={9} />
      {look.spotlight ? (
        <Spotlight
          palette={palette}
          x={60 - width * 0.25}
          y={top + faceHeight + 8}
          width={width * 0.5}
        />
      ) : (
        <Circle cx={60} cy={top + faceHeight + 11} r={1.8} fill={palette.ring} />
      )}
    </G>
  );
}

export function Sphere({ palette, look }: ShapeProps) {
  const radius = 27 * look.width;
  const baseTop = 82 - 22 * look.height;
  const cy = baseTop - radius + 8;
  return (
    <G>
      <Ellipse
        cx={60}
        cy={81}
        rx={22}
        ry={4.5}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={roundRect({ left: 44, top: baseTop, width: 32, height: 80 - baseTop, radius: 10 })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      {look.antennas > 0 ? (
        <Antenna palette={palette} x={60 + radius * 0.6} y={cy - radius * 0.6} lean={8} />
      ) : null}
      <Circle
        cx={60}
        cy={cy}
        r={radius}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      {look.visor ? (
        <G>
          <Path
            d={roundRect({ left: 50, top: cy - 18, width: 20, height: 30, radius: 10 })}
            fill={palette.face}
          />
          <Lens palette={palette} x={60} y={cy - 6} radius={6} />
          <Circle cx={60} cy={cy + 6} r={1.6} fill={palette.ring} />
        </G>
      ) : (
        <G>
          <Path
            d={`M${60 - radius} ${cy} Q60 ${cy + 10} ${60 + radius} ${cy}`}
            fill={NO_FILL}
            stroke={palette.line}
            strokeWidth={STROKE}
          />
          <Lens palette={palette} x={60} y={cy - 6} radius={7} />
        </G>
      )}
    </G>
  );
}

function BulletMount({ palette, look, right, bottom }: BulletMountProps) {
  if (look.mount === 'magnet')
    return (
      <G>
        <Line
          x1={60}
          y1={bottom}
          x2={60}
          y2={74}
          stroke={palette.line}
          strokeWidth={STROKE + 2}
          strokeLinecap="round"
        />
        <Circle
          cx={60}
          cy={bottom + 3}
          r={3}
          fill={palette.shade}
          stroke={palette.line}
          strokeWidth={STROKE}
        />
        <Ellipse
          cx={60}
          cy={78}
          rx={14}
          ry={4}
          fill={palette.body}
          stroke={palette.line}
          strokeWidth={STROKE}
        />
      </G>
    );
  return (
    <G>
      <Path
        d={roundRect({ left: right - 4, top: bottom - 4, width: 8, height: 28, radius: 2 })}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={`M${right} ${bottom + 6} L${right - 16} ${bottom - 2}`}
        stroke={palette.line}
        strokeWidth={STROKE + 1}
        strokeLinecap="round"
      />
    </G>
  );
}

export function Bullet({ palette, look }: ShapeProps) {
  const length = 64 * look.width;
  const height = 26 * look.height;
  const left = look.mount === 'magnet' ? 60 - length / 2 : 20;
  const top = (look.antennas > 0 ? 42 : 34) - height / 2;
  const right = left + length;
  const lensY = top + height / 2;
  return (
    <G>
      <BulletMount palette={palette} look={look} right={right} bottom={top + height} />
      {Array.from({ length: look.antennas }, (_, index) => (
        <Antenna
          key={index}
          palette={palette}
          x={right - 8 - index * 12}
          y={top + 2}
          lean={4 + index * 3}
        />
      ))}
      <Path
        d={roundRect({
          left: left,
          top: top,
          width: length,
          height: height,
          radius: height * 0.42,
        })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      {look.visor ? (
        <Path
          d={`M${left - 6} ${top - 2} L${right - 4} ${top - 2}`}
          stroke={palette.line}
          strokeWidth={STROKE + 2}
          strokeLinecap="round"
        />
      ) : null}
      <Ellipse
        cx={left + 4}
        cy={lensY}
        rx={7}
        ry={height / 2}
        fill={palette.face}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Circle
        cx={left + 4}
        cy={lensY}
        r={Math.min(6, height * 0.3)}
        fill={palette.glass}
        stroke={palette.ring}
        strokeWidth={STROKE}
      />
      {look.spotlight ? (
        <Spotlight palette={palette} x={left + 12} y={top + height - 9} width={16} />
      ) : null}
    </G>
  );
}

export function Outdoor({ palette, look }: ShapeProps) {
  return (
    <G>
      <Path
        d={roundRect({ left: 48, top: 6, width: 24, height: 7, radius: 2 })}
        fill={palette.shade}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Line x1={60} y1={13} x2={60} y2={22} stroke={palette.line} strokeWidth={STROKE + 1} />
      {look.antennas > 0 ? <Antenna palette={palette} x={34} y={30} lean={-8} /> : null}
      {look.antennas > 1 ? <Antenna palette={palette} x={86} y={30} lean={8} /> : null}
      <Path
        d={roundRect({ left: 30, top: 22, width: 60, height: 26, radius: 12 })}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
      />
      <Path
        d={OUTDOOR_HEAD}
        fill={palette.body}
        stroke={palette.line}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Lens palette={palette} x={60} y={60} radius={6} />
      {look.spotlight ? (
        <G>
          <Spotlight palette={palette} x={38} y={52} width={10} />
          <Spotlight palette={palette} x={72} y={52} width={10} />
        </G>
      ) : null}
    </G>
  );
}
