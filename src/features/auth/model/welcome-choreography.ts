import { MASCOT_TIMING, type MascotExpression } from '@/features/auth/constants/welcome-mascot';

export type LeftArmPose = 'rest' | 'tuck' | 'hatting';
export type RightArmPose = 'rest' | 'tuck' | 'lifted';
export type HatStage = 'none' | 'hide' | 'above' | 'aboveFront' | 'on';
export type LensStage = 'none' | 'hide' | 'emerge' | 'side' | 'lift';

export type MascotPose = {
  expression: MascotExpression;
  greeting: boolean;
  bubble: boolean;
  pulling: boolean;
  leftArm: LeftArmPose;
  rightArm: RightArmPose;
  hat: HatStage;
  lens: LensStage;
  revealed: number;
  look: number;
  attending: boolean;
  orbiting: boolean;
  settled: boolean;
  wobble: number;
};

export type PoseChange = Partial<Omit<MascotPose, 'wobble'>>;

export type ChoreographyEvent = {
  at: number;
  change: PoseChange;
  wobble: boolean;
};

export type WelcomeTimeline = {
  events: readonly ChoreographyEvent[];
  inspectFrom: number;
};

export const INITIAL_POSE: MascotPose = {
  expression: 'sleep',
  greeting: false,
  bubble: false,
  pulling: false,
  leftArm: 'rest',
  rightArm: 'rest',
  hat: 'none',
  lens: 'none',
  revealed: 0,
  look: 0,
  attending: false,
  orbiting: false,
  settled: false,
  wobble: 0,
};

export function restingPose(count: number): MascotPose {
  return {
    ...INITIAL_POSE,
    expression: 'neutral',
    hat: 'on',
    lens: 'side',
    revealed: count,
    settled: true,
  };
}

export function applyEvent(pose: MascotPose, event: ChoreographyEvent): MascotPose {
  return { ...pose, ...event.change, wobble: event.wobble ? pose.wobble + 1 : pose.wobble };
}

function event(at: number, change: PoseChange, wobble = false): ChoreographyEvent {
  return { at, change, wobble };
}

export function inspection(look: number, at: number, hold: number): ChoreographyEvent[] {
  const lift = at + MASCOT_TIMING.liftLead;
  return [
    event(at, { look, attending: true }),
    event(lift, { rightArm: 'lifted', lens: 'lift', expression: 'peer' }, true),
    event(
      lift + hold,
      { attending: false, rightArm: 'rest', lens: 'side', expression: 'neutral' },
      true
    ),
  ];
}

export function welcomeTimeline(count: number): WelcomeTimeline {
  const timing = MASCOT_TIMING;
  const opening: ChoreographyEvent[] = [
    event(timing.wake, { expression: 'neutral' }),
    event(timing.greet, { expression: 'smile', greeting: true, bubble: true }),
    event(timing.greetEnd, { expression: 'neutral', greeting: false, bubble: false }, true),
    event(timing.tuck, {
      leftArm: 'tuck',
      rightArm: 'tuck',
      pulling: true,
      hat: 'hide',
      lens: 'hide',
    }),
    event(timing.reach, { leftArm: 'hatting', hat: 'above', lens: 'emerge' }),
    event(timing.swap, { hat: 'aboveFront', lens: 'side', pulling: false }),
    event(timing.hatOn, { hat: 'on' }),
    event(timing.settle, {}, true),
    event(timing.rest, { leftArm: 'rest' }),
  ];
  const reveals = Array.from({ length: count }, (_, index) => {
    const at = timing.firstModule + index * timing.moduleStep;
    return [
      event(at, { revealed: index + 1 }),
      ...inspection(index, at + timing.lookLead, timing.revealHold),
    ];
  }).flat();
  const end = timing.firstModule + count * timing.moduleStep;
  const closing = [
    event(end, { expression: 'smile', orbiting: true, settled: true }),
    event(end + timing.smileHold, { expression: 'neutral' }),
  ];
  const events = [...opening, ...reveals, ...closing].sort((a, b) => a.at - b.at);
  return { events, inspectFrom: end + timing.inspectLead };
}

export type TimerHandle = ReturnType<typeof setTimeout>;

export type TimerClock = {
  setTimeout: (run: () => void, ms: number) => TimerHandle;
  clearTimeout: (handle: TimerHandle) => void;
};

export type TimerBook = {
  after: (ms: number, run: () => void) => TimerHandle;
  size: () => number;
  clear: () => void;
};

export function createTimerBook(clock: TimerClock): TimerBook {
  const live = new Set<TimerHandle>();
  return {
    after(ms, run) {
      const handle = clock.setTimeout(() => {
        live.delete(handle);
        run();
      }, ms);
      live.add(handle);
      return handle;
    },
    size: () => live.size,
    clear() {
      live.forEach((handle) => clock.clearTimeout(handle));
      live.clear();
    },
  };
}
