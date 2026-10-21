export const presenceStates = [
  'idle',
  'listen',
  'think',
  'speak',
  'look',
  'search',
  'found',
  'notfound',
  'known',
  'unknown',
  'happy',
  'error',
  'alert',
  'panic',
  'watch',
  'sleep',
  'off',
] as const;

export type PresenceState = (typeof presenceStates)[number];

export const presenceEvents = [
  'assemble',
  'appear',
  'disperse',
  'cancel',
  'ripple-in',
  'ripple-out',
  'notify',
  'glint',
  'modechange',
  'reconnect',
  'touch',
] as const;

export type PresenceEvent = (typeof presenceEvents)[number];

export type Rgb = readonly [number, number, number];

export type Palette = {
  a: Rgb;
  b: Rgb;
  c: Rgb;
  r: Rgb;
  g: Rgb;
  w: Rgb;
  glint: Rgb;
  additive: boolean;
  trail: number;
  density: number;
};

export type Particle = {
  u: number;
  v: number;
  s: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  ltx: number;
  lty: number;
  fresh: boolean;
};

export type ActiveEvent = {
  name: PresenceEvent;
  start: number;
  duration: number;
};

export type Engine = {
  particles: Particle[];
  seed: number;
  t0: number;
  lvl: number;
  pulse: number;
  lx: number;
  ly: number;
  tx: number;
  ty: number;
  intensity: number;
  event: ActiveEvent | null;
  endedEvent: PresenceEvent | null;
  point: [number, number];
};

export type Stroke = {
  round: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r: number;
  g: number;
  b: number;
  a: number;
  w: number;
};

export type StrokeSink = (stroke: Stroke) => void;

export type Frame = {
  state: PresenceState;
  t: number;
  size: number;
  palette: Palette;
  dark: boolean;
};

export type EventMods = {
  alpha: number;
  saturation: number;
  band: number | null;
  glint: number;
};
