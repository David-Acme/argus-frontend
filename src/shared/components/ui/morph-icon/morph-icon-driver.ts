import type { IconInput, SpringPreset } from 'morphicons';
import { canonicalD, createMorph, type MorphOptions, type ReducedMotionMode } from 'morphicons/dom';

export type MorphDriver = {
  morphTo(icon: IconInput, spring?: SpringPreset | MorphOptions): void;
  set(icon: IconInput): void;
  reduceMotion(mode: ReducedMotionMode): void;
  destroy(): void;
};

export type MorphDriverInput = {
  icon: IconInput;
  reducedMotion: ReducedMotionMode;
  onPath: (d: string) => void;
};

export function createMorphDriver({ icon, reducedMotion, onPath }: MorphDriverInput): MorphDriver {
  let painted = canonicalD(icon);
  const morph = createMorph(
    {
      setAttribute: (name, value) => {
        if (name !== 'd' || value === painted) return;
        painted = value;
        onPath(value);
      },
    },
    icon,
    { reducedMotion }
  );
  return {
    morphTo: (next, spring) => morph.morphTo(next, spring),
    set: (next) => morph.set(next),
    reduceMotion: (mode) => {
      morph.reducedMotion = mode;
    },
    destroy: () => morph.destroy(),
  };
}
