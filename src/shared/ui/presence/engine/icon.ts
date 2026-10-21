import { alphaFor, colorFor, eventMods, mixInto } from './paint';
import { sparkle, type Paint } from './frame';
import { EYES, pupilX } from './shapes';
import type { Rgb } from './types';

const TAU = Math.PI * 2;

type Curve = (u: number, out: [number, number]) => void;

type Line = { curve: Curve; count: number; width: number };

type IconPaint = Paint & { scale: number; alpha: number };

function strokeCurve(paint: IconPaint, line: Line): void {
  'worklet';
  const { frame, scratch, scale } = paint;
  const { palette, state, size } = frame;
  const s = scratch.stroke;
  const half = size / 2;
  const from: [number, number] = [0, 0];
  const to: [number, number] = [0, 0];
  s.round = true;
  for (let i = 0; i < line.count; i++) {
    const u = i / (line.count - 1);
    line.curve(u, from);
    line.curve(Math.min(1, (i + 1) / (line.count - 1)), to);
    const w = Math.sin(Math.PI * u);
    colorFor(palette, state, u, scratch.color);
    if (scratch.mods.saturation < 1) mixInto(scratch.color, palette.g, scratch.color, scratch.mods.saturation);
    s.x1 = half + from[0] * scale;
    s.y1 = half + from[1] * scale;
    s.x2 = half + to[0] * scale;
    s.y2 = half + to[1] * scale;
    s.w = Math.max(1.2, scale * line.width * w);
    s.r = scratch.color[0];
    s.g = scratch.color[1];
    s.b = scratch.color[2];
    s.a = Math.min(1, (frame.dark ? 1 : 0.9) * paint.alpha * (0.45 + 0.55 * w));
    paint.sink(s);
  }
}

type Dot = { x: number; y: number; r: number; a: number };

function dot(paint: IconPaint, d: Dot): void {
  'worklet';
  const { frame, scratch, scale } = paint;
  const s = scratch.stroke;
  const half = frame.size / 2;
  const color: Rgb = frame.dark ? frame.palette.w : frame.palette.a;
  s.round = false;
  s.x1 = s.x2 = half + d.x * scale;
  s.y1 = s.y2 = half + d.y * scale;
  s.w = d.r;
  s.r = color[0];
  s.g = color[1];
  s.b = color[2];
  s.a = Math.min(1, d.a);
  paint.sink(s);
}

function paintEye(paint: IconPaint): void {
  'worklet';
  const { frame, engine, scale } = paint;
  const { state, t, size } = frame;
  const lids = EYES[state] ?? [0, 0];
  const up = lids[0] * 1.2;
  const lo = lids[1] * 1.2;
  const drop = state === 'notfound' ? 0.08 : 0;
  strokeCurve(paint, { curve: (u, o) => { o[0] = (u - 0.5) * 1.7; o[1] = -up * Math.sin(Math.PI * u) + drop; }, count: 22, width: 0.12 });
  strokeCurve(paint, { curve: (u, o) => { o[0] = (u - 0.5) * 1.7; o[1] = lo * Math.sin(Math.PI * u) + drop; }, count: 22, width: 0.1 });
  const gx = pupilX(state, t, engine);
  if (state !== 'notfound') {
    const span = (lids[0] + lids[1]) * 1.1;
    strokeCurve(paint, {
      curve: (u, o) => { o[0] = gx + 0.06 * Math.sin(Math.PI * u) * (u < 0.5 ? -1 : 1); o[1] = (u - 0.5) * span; },
      count: 10,
      width: 0.14,
    });
  }
  if (paint.scratch.mods.glint > 0 || state === 'known') {
    const half = size / 2;
    const color = paint.scratch.color;
    mixInto(color, frame.dark ? frame.palette.w : frame.palette.a, frame.palette.a, 0);
    sparkle(paint, { x: half + gx * scale + scale * 0.25, y: half - scale * 0.3, r: scale * 0.16, a: 0.9, color });
  }
}

function crescent(paint: IconPaint): Curve {
  'worklet';
  const { frame, engine } = paint;
  const sway = frame.state === 'off' ? 0 : 0.05 * Math.sin(frame.t * 0.8);
  return (u, o) => {
    const th = -2.5 + u * 2.3 + sway;
    o[0] = Math.cos(th) * 0.8 + engine.lx;
    o[1] = Math.sin(th) * 0.62 + 0.3 + engine.ly;
  };
}

function paintCrescent(paint: IconPaint): void {
  'worklet';
  const { frame, scale } = paint;
  const { state, t } = frame;
  const curve = crescent(paint);
  const loud = state === 'alert' || state === 'panic';
  strokeCurve(paint, { curve, count: 24, width: loud ? 0.18 : 0.15 });
  const head: [number, number] = [0, 0];
  curve(0.98, head);
  const rate = state === 'panic' ? 7.5 : state === 'alert' ? 6 : 2;
  dot(paint, { x: head[0], y: head[1], r: Math.max(2, scale * 0.16), a: 0.9 * (0.75 + 0.25 * Math.sin(t * rate)) });
  if (state !== 'happy') return;
  const sparks: readonly (readonly [number, number])[] = [[0.45, -0.6], [0.75, -0.25], [0.15, -0.8]];
  sparks.forEach(([x, y], i) => {
    const k = (t * 0.9 + i * 0.33) % 1;
    dot(paint, { x, y, r: Math.max(1.5, scale * 0.12 * (1 - k)), a: 1 - k });
  });
}

function paintListen(paint: IconPaint): void {
  'worklet';
  const { engine, frame } = paint;
  const curve = crescent(paint);
  const wobble = 0.04 * Math.sin(frame.t * 5) * engine.lvl;
  strokeCurve(paint, {
    curve: (u, o) => { curve(u, o); o[0] *= 0.9; o[1] += wobble; },
    count: 24,
    width: 0.14 + 0.05 * engine.lvl,
  });
}

function paintWatch(paint: IconPaint): void {
  'worklet';
  const { frame, scale } = paint;
  strokeCurve(paint, { curve: (u, o) => { o[0] = (u - 0.5) * 1.7; o[1] = 0.15 - 0.38 * Math.sin(Math.PI * u); }, count: 24, width: 0.11 });
  const g = Math.sin(frame.t * 0.5) * 0.6;
  const uu = g / 1.7 + 0.5;
  dot(paint, { x: g, y: 0.15 - 0.38 * Math.sin(Math.PI * uu), r: Math.max(2.5, scale * 0.2), a: 1 });
}

function paintWave(paint: IconPaint): void {
  'worklet';
  const { frame, engine } = paint;
  const { state, t } = frame;
  if (state === 'think') {
    strokeCurve(paint, { curve: (u, o) => { o[0] = (u - 0.5) * 1.6; o[1] = Math.sin(u * TAU + t * 1.6) * 0.3; }, count: 26, width: 0.13 });
    return;
  }
  const amp = 0.08 + 0.32 * engine.lvl;
  strokeCurve(paint, {
    curve: (u, o) => { o[0] = (u - 0.5) * 1.7; o[1] = Math.sin(u * TAU * 1.3 + t * 4) * amp * Math.sin(Math.PI * u); },
    count: 26,
    width: 0.13,
  });
}

function paintLine(paint: IconPaint): void {
  'worklet';
  const { state, t } = paint.frame;
  if (state === 'error') {
    strokeCurve(paint, { curve: (u, o) => { o[0] = (u - 0.5) * 1.5; o[1] = 0.3 * Math.sin(Math.PI * u); }, count: 20, width: 0.09 });
    return;
  }
  const still = state === 'off';
  strokeCurve(paint, {
    curve: (u, o) => { o[0] = (u - 0.5) * 1.5; o[1] = 0.15 + (still ? 0 : 0.02 * Math.sin(u * 3 + t * 0.4)); },
    count: 20,
    width: 0.07,
  });
}

export function paintIcon(paint: Paint): void {
  'worklet';
  const { frame, engine, scratch } = paint;
  const mods = eventMods(engine, frame.t, scratch.mods);
  const icon: IconPaint = { ...paint, scale: frame.size * 0.46, alpha: alphaFor(frame.state, engine, frame.t) * mods.alpha };
  switch (frame.state) {
    case 'sleep':
    case 'off':
    case 'error':
      return paintLine(icon);
    case 'think':
    case 'speak':
      return paintWave(icon);
    case 'watch':
      return paintWatch(icon);
    case 'listen':
      return paintListen(icon);
    case 'idle':
    case 'alert':
    case 'panic':
    case 'happy':
      return paintCrescent(icon);
    default:
      return paintEye(icon);
  }
}
