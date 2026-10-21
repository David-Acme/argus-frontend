import { clamp, lerp } from './shapes';
import type { Engine, EventMods, Palette, PresenceState, Rgb } from './types';

const TAU = Math.PI * 2;

export type Color = [number, number, number];

export function mixInto(out: Color, a: Rgb, b: Rgb, k: number): Color {
  'worklet';
  out[0] = lerp(a[0], b[0], k);
  out[1] = lerp(a[1], b[1], k);
  out[2] = lerp(a[2], b[2], k);
  return out;
}

const STATE_TINT: Partial<Record<PresenceState, readonly ['a' | 'c' | 'r' | 'g', number]>> = {
  alert: ['r', 0.5],
  panic: ['r', 0.7],
  known: ['a', 0.45],
  unknown: ['c', 0.4],
  error: ['g', 0.45],
  notfound: ['g', 0.45],
};

export function colorFor(palette: Palette, state: PresenceState, u: number, out: Color): Color {
  'worklet';
  if (state === 'off') {
    out[0] = palette.g[0];
    out[1] = palette.g[1];
    out[2] = palette.g[2];
    return out;
  }
  mixInto(out, palette.b, palette.c, u);
  mixInto(out, palette.a, out, Math.min(1, u * 1.4));
  const tint = STATE_TINT[state];
  if (tint) mixInto(out, out, palette[tint[0]], tint[1]);
  return out;
}

function baseAlpha(state: PresenceState): number {
  'worklet';
  if (state === 'sleep') return 0.35;
  if (state === 'off') return 0.42;
  if (state === 'error' || state === 'notfound') return 0.5;
  if (state === 'panic') return 1;
  if (state === 'alert') return 0.95;
  return 0.8;
}

function breath(state: PresenceState, t: number): number {
  'worklet';
  if (state === 'panic') return 0.88 + 0.12 * Math.sin(t * TAU * 1.2);
  if (state === 'watch') return 0.9 + 0.1 * Math.sin(t * TAU * 0.12);
  return 0.92 + 0.08 * Math.sin(t * TAU * 0.2);
}

export function alphaFor(state: PresenceState, engine: Engine, t: number): number {
  'worklet';
  const a = baseAlpha(state);
  if (state === 'off') return a;
  const voice = state === 'speak' ? 1 + 0.5 * engine.lvl : 1;
  return a * breath(state, t) * (1 + engine.pulse * 0.9) * voice;
}

export function syntheticVoice(state: PresenceState, t: number): number {
  'worklet';
  if (state === 'speak') {
    return clamp(Math.abs(Math.sin(t * 6.1) * Math.sin(t * 2.3 + 1)) * (0.6 + 0.4 * Math.sin(t * 1.1)), 0, 1);
  }
  if (state === 'listen') return 0.35 * Math.abs(Math.sin(t * 4.2) * Math.sin(t * 1.6));
  return 0;
}

export function eventProgress(engine: Engine, t: number): number | null {
  'worklet';
  const event = engine.event;
  if (!event) return null;
  const k = (t - event.start) / event.duration;
  if (k < 1) return k;
  engine.endedEvent = event.name;
  engine.event = null;
  return null;
}

export function eventMods(engine: Engine, t: number, out: EventMods): EventMods {
  'worklet';
  out.alpha = 1;
  out.saturation = 1;
  out.band = null;
  out.glint = 0;
  const k = eventProgress(engine, t);
  const name = engine.event?.name;
  if (k === null || !name) return out;
  if (name === 'assemble' || name === 'appear') out.alpha = Math.min(1, k * 1.6);
  if (name === 'disperse' || name === 'cancel') out.alpha = 1 - k;
  if (name === 'reconnect') out.saturation = k;
  if (name === 'ripple-in') out.band = 1 - k;
  if (name === 'ripple-out') out.band = k;
  if (name === 'glint') out.glint = 1 - k;
  return out;
}
