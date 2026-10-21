import { createEngine, playEvent, stepEngine } from './engine';
import { createScratch, paintParticles, type Scratch } from './frame';
import { paintIcon } from './icon';
import type { Engine, Frame, Palette, PresenceEvent, PresenceState, StrokeSink } from './types';

export type DriverInput = {
  state: PresenceState;
  resting: boolean;
  intensity: number;
  targetX: number;
  targetY: number;
  eventName: PresenceEvent | null;
  eventId: number;
};

export type Driver = {
  engine: Engine;
  scratch: Scratch;
  last: number;
  eventId: number;
  scroll: number;
  scrollAt: number;
};

export type Tick = {
  now: number;
  input: DriverInput;
  level: number | null;
  scroll: number;
  leanX: number;
  leanY: number;
  steps: number;
};

export type Look = {
  size: number;
  palette: Palette;
  dark: boolean;
  activeFps: number;
  restFps: number;
  leanWhileScrolling: boolean;
};

const SCROLL_QUIET = 0.2;
const DRIFT_PX = 160;

export function createDriver(count: number, seed: number): Driver {
  'worklet';
  return {
    engine: createEngine(count, seed),
    scratch: createScratch(),
    last: 0,
    eventId: 0,
    scroll: 0,
    scrollAt: -1,
  };
}

export function stepsDue(driver: Driver, tick: Tick, look: Look): number {
  'worklet';
  const resting = tick.input.resting && driver.engine.event === null;
  const interval = 1 / (resting ? look.restFps : look.activeFps);
  const elapsed = tick.now - driver.last;
  if (driver.last > 0 && elapsed < interval - 0.004) return 0;
  const steps = driver.last > 0 ? Math.round(elapsed * 60) : 1;
  driver.last = tick.now;
  return Math.max(1, Math.min(3, steps));
}

function scrolling(driver: Driver, tick: Tick): boolean {
  'worklet';
  if (tick.scroll !== driver.scroll) {
    driver.scroll = tick.scroll;
    driver.scrollAt = tick.now;
  }
  return driver.scrollAt >= 0 && tick.now - driver.scrollAt < SCROLL_QUIET;
}

export function advance(driver: Driver, tick: Tick, look: Look): Frame {
  'worklet';
  const { engine } = driver;
  const { input } = tick;
  const t = tick.now + engine.t0;
  engine.intensity = input.intensity;
  engine.tx = input.targetX;
  engine.ty = input.targetY;
  if (input.eventName && input.eventId !== driver.eventId) {
    driver.eventId = input.eventId;
    playEvent(engine, input.eventName, t);
  }
  const quiet = look.leanWhileScrolling || !scrolling(driver, tick);
  const scroll = Math.min(Math.max(tick.scroll, 0), DRIFT_PX) / DRIFT_PX;
  const { steps } = tick;
  for (let i = 0; i < steps; i++) {
    stepEngine(engine, {
      state: input.state,
      t: t - (steps - 1 - i) / 60,
      level: tick.level,
      leanX: quiet ? tick.leanX : 0,
      leanY: quiet ? tick.leanY : 0,
      scroll: quiet ? scroll : 0,
      carry: i > 0,
    });
  }
  return { state: input.state, t, size: look.size, palette: look.palette, dark: look.dark };
}

export function paintFrame(driver: Driver, frame: Frame, sink: StrokeSink): void {
  'worklet';
  const paint = { frame, engine: driver.engine, scratch: driver.scratch, sink };
  if (driver.engine.particles.length > 0) paintParticles(paint);
  else paintIcon(paint);
}

export function takeEndedEvent(driver: Driver): PresenceEvent | null {
  'worklet';
  const ended = driver.engine.endedEvent;
  driver.engine.endedEvent = null;
  return ended;
}

export type StillPass = { begin: () => void; sink: StrokeSink; end: () => void };

export type StillInput = { tick: Tick; look: Look; pass: StillPass };

export function paintStill(driver: Driver, { tick, look, pass }: StillInput): void {
  'worklet';
  const { engine } = driver;
  engine.lx = engine.ly = 0;
  engine.event = null;
  const base = 8;
  const frameAt = (i: number): Tick => ({
    ...tick,
    now: base + i / 60,
    leanX: 0,
    leanY: 0,
    scroll: 0,
    steps: 1,
  });
  if (engine.particles.length === 0) {
    pass.begin();
    paintFrame(driver, advance(driver, frameAt(0), look), pass.sink);
    pass.end();
    return;
  }
  for (let i = 0; i < 240; i++) advance(driver, frameAt(i), look);
  for (const p of engine.particles) {
    p.px = p.x;
    p.py = p.y;
  }
  for (let i = 0; i < 14; i++) {
    pass.begin();
    paintFrame(driver, advance(driver, frameAt(240 + i), look), pass.sink);
    pass.end();
  }
}
