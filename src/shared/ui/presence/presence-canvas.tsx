import { Canvas, ColorMatrix, Image, type SkImage } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio } from 'react-native';
import { useFrameCallback, useSharedValue, type FrameInfo } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { shiftTier } from '@/shared/theme/effects';
import { paintStill, takeEndedEvent, type Look, type Tick } from './engine/driver';
import { notePace } from './engine/pace';
import { stepFrame, tickOf } from './frame-loop';
import type { PresenceEvent } from './engine/types';
import type { PresenceCanvasProps } from './presence-canvas.types';
import { beginFrame, endFrame, flushAtlas } from './skia-scene';
import { prepare, release, type Runtime, type Spec } from './skia-runtime';

const MAX_RATIO = 2;
const RESIDUE = 3 / 255;
const RESIDUE_CUT = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, -RESIDUE];

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

function useStableHandler(onEventEnd: PresenceCanvasProps['onEventEnd']) {
  const latest = useRef(onEventEnd);
  useEffect(() => {
    latest.current = onEventEnd;
  });
  const [ended] = useState(() => (name: PresenceEvent) => latest.current?.(name));
  return ended;
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
  const ended = useStableHandler(onEventEnd);
  const spec = useMemo<Spec>(
    () => ({ count: plan.count, seed, ratio: Math.min(MAX_RATIO, PixelRatio.get()) }),
    [plan.count, seed]
  );
  const fade = plan.trails ? look.palette.trail : 1;
  const { watch, climbWork, patience, tier } = plan;

  const step = useCallback(
    (info: FrameInfo) => {
      'worklet';
      const current = prepare(runtime.get(), { look, spec, shown: image.get() });
      if (!current) return;
      if (current !== runtime.get()) runtime.set(current);
      const now = info.timestamp / 1000;
      const since = (info.timeSincePreviousFrame ?? 0) / 1000;
      const drawn = stepFrame(current, { now, since, live, look, fade });
      if (!drawn) return;
      image.set(drawn.image);
      const sample = { now, work: drawn.work, interval: drawn.interval };
      const shift = watch ? notePace(current.pace, sample, { climbWork, patience }) : 0;
      if (shift !== 0) scheduleOnRN(shiftTier, tier, shift);
      const name = takeEndedEvent(current.driver);
      if (name) scheduleOnRN(ended, name);
    },
    [runtime, image, look, spec, live, fade, watch, climbWork, patience, tier, ended]
  );
  const frameCallback = useFrameCallback(step, false);

  const animate = !plan.still && active;
  const box = { width: plan.size, height: plan.size };

  useEffect(() => {
    frameCallback.setActive(animate);
  }, [frameCallback, animate]);

  useEffect(() => {
    if (!plan.still) return;
    scheduleOnUI(() => {
      'worklet';
      const current = prepare(runtime.get(), { look, spec, shown: image.get() });
      if (!current) return;
      runtime.set(current);
      const tick = { ...tickOf(live, 8), level: null, scroll: 0, leanX: 0, leanY: 0 };
      image.set(paintStillFrame(current, { tick, look, fade }));
    });
  }, [plan.still, stillKey, look, spec, fade, image, live, runtime]);

  useEffect(
    () => () =>
      scheduleOnUI(() => {
        'worklet';
        release(runtime.get(), image.get());
        runtime.set(null);
      }),
    [runtime, image]
  );

  return (
    <Canvas style={box} pointerEvents="none">
      <Image image={image} x={0} y={0} width={plan.size} height={plan.size} fit="fill">
        {plan.trails ? <ColorMatrix matrix={RESIDUE_CUT} /> : null}
      </Image>
    </Canvas>
  );
}
