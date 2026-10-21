import type { Engine, Particle, PresenceState } from './types';

const TAU = Math.PI * 2;

export type ShapeInput = { state: PresenceState; t: number; engine: Engine };

export const EYES: Partial<Record<PresenceState, readonly [number, number]>> = {
  look: [0.3, 0.22],
  search: [0.26, 0.18],
  found: [0.22, 0.16],
  known: [0.3, 0.22],
  unknown: [0.19, 0.13],
  notfound: [0.06, 0.04],
};

export function lerp(a: number, b: number, k: number): number {
  'worklet';
  return a + (b - a) * k;
}

export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}

export function isEye(state: PresenceState): boolean {
  'worklet';
  return EYES[state] !== undefined;
}

export function pupilX(state: PresenceState, t: number, engine: Engine): number {
  'worklet';
  if (state === 'search') return Math.sin(t * 1.7) * 0.58;
  if (state === 'found' || state === 'known' || state === 'unknown') return engine.tx;
  return Math.sin(t * 0.5) * 0.28 + engine.lx * 0.5;
}

function swirlSpeed(state: PresenceState): number {
  'worklet';
  if (state === 'panic') return 0.95;
  if (state === 'alert') return 0.55;
  return 0.12;
}

function swirlRadius(state: PresenceState): number {
  'worklet';
  if (state === 'panic') return 0.8;
  if (state === 'alert') return 0.9;
  return 1;
}

function swirl(p: Particle, input: ShapeInput, out: [number, number]): void {
  'worklet';
  const { state, t, engine } = input;
  const th = 0.6 + p.u * 4.4 + t * swirlSpeed(state) * (0.6 + 0.8 * engine.intensity);
  const r = 0.1 + 0.8 * p.u * swirlRadius(state);
  const x = Math.cos(th) * r * 1.15;
  const y = Math.sin(th) * r * 0.55;
  const w = (0.08 * Math.sin(Math.PI * p.u) + 0.01) * p.v;
  const c = Math.cos(-0.25);
  const s = Math.sin(-0.25);
  out[0] = x * c - y * s + w;
  out[1] = x * s + y * c + w * 0.6;
}

function listen(p: Particle, { t }: ShapeInput, out: [number, number]): void {
  'worklet';
  const uu = (p.u + t * 0.35) % 1;
  out[0] = p.v * (1 - Math.pow(uu, 1.3)) * 0.9;
  out[1] = lerp(-0.55, 0.48, uu);
}

function think(p: Particle, { t }: ShapeInput, out: [number, number]): void {
  'worklet';
  const k = Math.floor(p.s * 3);
  const uu = (p.u + t * 0.08) % 1;
  out[0] = (uu - 0.5) * 1.7;
  out[1] = Math.sin(uu * TAU * 1.5 + t * 1.8 + (k * TAU) / 3) * 0.22 * (1 - Math.pow(2 * uu - 1, 2) * 0.5) + p.v * 0.01;
}

function speak(p: Particle, { t, engine }: ShapeInput, out: [number, number]): void {
  'worklet';
  const level = engine.lvl;
  const uu = (p.u + t * 0.06) % 1;
  const hump = Math.sin(Math.PI * uu);
  out[0] = (uu - 0.5) * 1.8;
  out[1] = Math.sin(uu * TAU * 1.2 + t * 3) * (0.06 + 0.26 * level) * hump + p.v * (0.015 + 0.08 * level) * hump;
}

function watch(p: Particle, { t }: ShapeInput, out: [number, number]): void {
  'worklet';
  const g = Math.sin(t * 0.4) * 0.62;
  if (p.s < 0.78) {
    const uu = (p.u + t * 0.03) % 1;
    out[0] = (uu - 0.5) * 1.7;
    out[1] = 0.12 - 0.3 * Math.sin(Math.PI * uu) + p.v * 0.012;
    return;
  }
  const x = g + p.v * 0.07;
  const uu = clamp(x / 1.7 + 0.5, 0, 1);
  out[0] = x;
  out[1] = 0.12 - 0.3 * Math.sin(Math.PI * uu) + p.v * 0.03;
}

function lid(p: Particle, t: number, out: [number, number]): number {
  'worklet';
  const uu = (p.u + t * 0.05) % 1;
  out[0] = (uu - 0.5) * 1.7;
  out[1] = p.v * 0.01;
  return Math.sin(Math.PI * uu);
}

function eye(p: Particle, input: ShapeInput, out: [number, number]): void {
  'worklet';
  const { state, t, engine } = input;
  const lids = EYES[state];
  const up = lids ? lids[0] : 0;
  const lo = lids ? lids[1] : 0;
  const drop = state === 'notfound' ? 0.06 : 0;
  if (p.s < 0.76 || state === 'notfound') {
    const hump = lid(p, t, out);
    const height = p.s < 0.38 ? -up : p.s < 0.76 ? lo : 0;
    out[1] += height * hump + drop;
    return;
  }
  const gx = pupilX(state, t, engine);
  const gy = engine.ly * 0.25 + engine.ty * 0.25;
  const f = (p.u * 2 + t * 0.4) % 1;
  const side = p.u < 0.5 ? -1 : 1;
  const pw = state === 'found' || state === 'unknown' ? 0.05 : 0.075;
  out[0] = gx + side * pw * Math.sin(Math.PI * f) + p.v * 0.006;
  out[1] = gy + (f - 0.5) * (up + lo) * 0.6;
}

function happy(p: Particle, { t }: ShapeInput, out: [number, number]): void {
  'worklet';
  if (p.s > 0.86) {
    const k = (t * 0.7 + p.v * 0.5 + 1) % 1;
    const a = p.u * TAU;
    const r = 0.05 + k * 0.42;
    out[0] = 0.62 + Math.cos(a) * r;
    out[1] = -0.32 + Math.sin(a) * r * 0.8;
    return;
  }
  const uu = (p.u + t * 0.1) % 1;
  out[0] = (uu - 0.5) * 1.5;
  out[1] = 0.25 - 0.6 * uu * uu + 0.06 * Math.sin(uu * TAU * 1.5 + t * 2) + p.v * 0.012;
}

function droop(p: Particle, { t }: ShapeInput, out: [number, number]): void {
  'worklet';
  const uu = (p.u + t * 0.03) % 1;
  out[0] = (uu - 0.5) * 1.5;
  out[1] = 0.05 + 0.26 * Math.sin(Math.PI * uu) + p.v * 0.01;
}

function rest(p: Particle, { t }: ShapeInput, out: [number, number]): void {
  'worklet';
  out[0] = (p.u - 0.5) * 1.6 + 0.02 * Math.sin(t * 0.2);
  out[1] = 0.28 + Math.sin(p.u * 3 + t * 0.3) * 0.02 + p.v * 0.006;
}

export function shapeTarget(p: Particle, input: ShapeInput, out: [number, number]): void {
  'worklet';
  switch (input.state) {
    case 'idle':
    case 'alert':
    case 'panic':
      return swirl(p, input, out);
    case 'listen':
      return listen(p, input, out);
    case 'think':
      return think(p, input, out);
    case 'speak':
      return speak(p, input, out);
    case 'watch':
      return watch(p, input, out);
    case 'happy':
      return happy(p, input, out);
    case 'error':
      return droop(p, input, out);
    case 'off':
      out[0] = (p.u - 0.5) * 1.5;
      out[1] = 0.18 + p.v * 0.008;
      return;
    case 'sleep':
      return rest(p, input, out);
    default:
      return eye(p, input, out);
  }
}
