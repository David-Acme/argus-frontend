import type { SharedValue } from 'react-native-reanimated';
import { size } from '@/shared/theme/tokens';
import {
  easeToward,
  liveBarCount,
  liveBarHeight,
  liveBarX,
  scrollShare,
} from '@/features/conversations/model/live-wave';
import type { LiveLevels, WaveBox } from '@/features/conversations/model/live-wave';
import { RECORDER_TICK_MS } from '@/features/conversations/model/voice-note';

export type WavePaint = {
  context: CanvasRenderingContext2D;
  box: WaveBox;
  ratio: number;
  tint: string;
  still: boolean;
  live: SharedValue<LiveLevels>;
};

type Pace = { seq: number; landedAt: number; newest: number; last: number };

function paint({ context, box, live }: WavePaint, pace: Pace, now: number): void {
  const current = live.get();
  if (current.seq !== pace.seq) {
    pace.seq = current.seq;
    pace.landedAt = now;
  }
  const target = current.values[current.values.length - 1] ?? 0;
  pace.newest = easeToward(pace.newest, target, pace.last === 0 ? 0 : now - pace.last);
  pace.last = now;
  const share = scrollShare(now - pace.landedAt, RECORDER_TICK_MS);
  const count = Math.min(current.values.length, liveBarCount(box));
  context.clearRect(0, 0, box.width, box.height);
  context.beginPath();
  for (let fromEnd = 0; fromEnd < count; fromEnd++) {
    const level =
      fromEnd === 0 ? pace.newest : (current.values[current.values.length - 1 - fromEnd] ?? 0);
    const height = liveBarHeight(box, level);
    context.roundRect(
      liveBarX(box, fromEnd, share),
      (box.height - height) / 2,
      size.liveBar,
      height,
      size.liveBar / 2
    );
  }
  context.fill();
}

export function paintWave(job: WavePaint): () => void {
  const { context, box, ratio, tint } = job;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = tint;
  if (job.still) {
    context.clearRect(0, 0, box.width, box.height);
    context.fillRect(0, box.height / 2 - size.liveBar / 2, box.width, size.liveBar);
    return () => undefined;
  }
  const pace: Pace = { seq: -1, landedAt: 0, newest: 0, last: 0 };
  let handle = 0;
  const loop = (now: number) => {
    paint(job, pace, now);
    handle = globalThis.requestAnimationFrame(loop);
  };
  handle = globalThis.requestAnimationFrame(loop);
  return () => globalThis.cancelAnimationFrame(handle);
}
