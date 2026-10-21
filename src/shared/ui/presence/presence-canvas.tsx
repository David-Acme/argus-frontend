import { Canvas, ColorMatrix, Image, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { PixelRatio } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { shiftTier } from '@/shared/theme/effects';
import {
  advance,
  frameInterval,
  paintStill,
  frameDue,
  takeEndedEvent,
  type Look,
  type Tick,
} from './engine/driver';
import { notePace } from './engine/pace';
import type { PresenceEvent } from './engine/types';
import type { PresenceCanvasProps, PresenceLive } from './presence-canvas.types';
import { beginFrame, endFrame, flushAtlas } from './skia-scene';
import { draw, prepare, type Runtime, type Spec } from './skia-runtime';

const MAX_RATIO = 2;
const RESIDUE = 3 / 255;
const RESIDUE_CUT = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, -RESIDUE];

function tickOf(live: PresenceLive, now: number): Tick {
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

type StillFrame = { tick: Tick; look: Look; fade: number };

function paintStillFrame(runtime: Runtime, { tick, look, fade }: StillFrame): SkImage | null {
  'worklet';
  const { scene, driver } = runtime;
  const particles = driver.engine.particles.length > 0;
  let last: SkImage | null = null;
  beginFrame(scene, 1);
  paintStill(driver, {
    tick,
    look,
    pass: {
      begin: () => beginFrame(scene, particles ? fade : 1),
      sinks: runtime.sinks,
      end: () => {
        if (particles) flushAtlas(scene, look.palette.additive);
        last = endFrame(scene);
      },
    },
  });
  return last;
}

export function PresenceCanvas({
  plan,
  look,
  live,
  seed,
  active,
  stillKey,
  onEventEnd,
}: PresenceCanvasProps) {
  const image = useSharedValue<SkImage | null>(null);
  const runtime = useSharedValue<Runtime | null>(null);
  const [ended] = useState(() => (name: PresenceEvent) => onEventEnd?.(name));
  const spec = useMemo<Spec>(
    () => ({ count: plan.count, seed, ratio: Math.min(MAX_RATIO, PixelRatio.get()) }),
    [plan.count, seed]
  );
  const fade = plan.trails ? look.palette.trail : 1;
  const { watch, climb, patience, tier } = plan;

  const frameCallback = useFrameCallback((info) => {
    'worklet';
    const current = prepare(runtime.get(), look, spec);
    if (!current) return;
    if (current !== runtime.get()) runtime.set(current);
    const tick = tickOf(live, info.timestamp / 1000);
    if (!frameDue(current.driver, tick, look)) return;
    const started = performance.now();
    image.set(draw(current, advance(current.driver, tick, look), fade));
    const work = (performance.now() - started) / 1000;
    const interval = frameInterval(current.driver, tick, look);
    const shift = watch
      ? notePace(current.pace, { now: tick.now, work, interval }, { climb, patience })
      : 0;
    if (shift !== 0) scheduleOnRN(shiftTier, tier, shift);
    const name = takeEndedEvent(current.driver);
    if (name) scheduleOnRN(ended, name);
  }, false);

  const animate = !plan.still && active;
  const box = { width: plan.size, height: plan.size };

  useEffect(() => {
    frameCallback.setActive(animate);
  }, [frameCallback, animate]);

  useEffect(() => {
    if (!plan.still) return;
    scheduleOnUI(() => {
      'worklet';
      const current = prepare(runtime.get(), look, spec);
      if (!current) return;
      runtime.set(current);
      const tick = { ...tickOf(live, 8), level: null, scroll: 0, leanX: 0, leanY: 0 };
      image.set(paintStillFrame(current, { tick, look, fade }));
    });
  }, [plan.still, stillKey, look, spec, fade, image, live, runtime]);

  return (
    <Canvas style={box} pointerEvents="none">
      <Image image={image} x={0} y={0} width={plan.size} height={plan.size} fit="fill">
        {plan.trails ? <ColorMatrix matrix={RESIDUE_CUT} /> : null}
      </Image>
    </Canvas>
  );
}
