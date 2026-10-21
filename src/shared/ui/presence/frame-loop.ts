import type { SkImage } from '@shopify/react-native-skia';
import { advance, frameDue, frameInterval, type Look, type Tick } from './engine/driver';
import { noteBeat } from './engine/pace';
import type { PresenceLive } from './presence-canvas.types';
import { canPaintAhead, draw, paintAhead, present, type Runtime } from './skia-runtime';

const AHEAD_ROOM = 1.5;

export type FrameJob = { now: number; since: number; live: PresenceLive; look: Look; fade: number };

export type Drawn = { image: SkImage; work: number; interval: number };

export function tickOf(live: PresenceLive, now: number): Tick {
  'worklet';
  const lean = live.lean.get();
  return {
    now,
    input: live.input.get(),
    level: live.level ? live.level.get() : null,
    scroll: live.scroll ? live.scroll.get() : 0,
    leanX: lean[0],
    leanY: lean[1],
    steps: 1,
    lag: 0,
    split: false,
  };
}

function paintEarly(current: Runtime, job: FrameJob, tick: Tick): void {
  'worklet';
  const { beat } = current.pace;
  const interval = frameInterval(current.driver, tick, job.look);
  if (!canPaintAhead(current) || beat <= 0 || beat * AHEAD_ROOM > interval) return;
  const next: Tick = { ...tick, now: job.now + beat };
  if (!frameDue(current.driver, next, job.look)) return;
  const started = performance.now();
  const frame = advance(current.driver, next, job.look);
  paintAhead(current, frame);
  current.ahead = { frame, work: (performance.now() - started) / 1000, interval };
}

export function stepFrame(current: Runtime, job: FrameJob): Drawn | null {
  'worklet';
  noteBeat(current.pace, job.since);
  const ahead = current.ahead;
  const started = performance.now();
  if (ahead) {
    current.ahead = null;
    const image = present(current, ahead.frame, job.fade);
    const work = ahead.work + (performance.now() - started) / 1000;
    return { image, work, interval: ahead.interval };
  }
  const tick = tickOf(job.live, job.now);
  if (!frameDue(current.driver, tick, job.look)) {
    paintEarly(current, job, tick);
    return null;
  }
  const image = draw(current, advance(current.driver, tick, job.look), job.fade);
  const work = (performance.now() - started) / 1000;
  return { image, work, interval: frameInterval(current.driver, tick, job.look) };
}
