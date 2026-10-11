import { describe, expect, test } from 'bun:test';
import { MASCOT_TIMING } from '@/features/auth/constants/welcome-mascot';
import {
  gazeDirection,
  orbitAngle,
  orbitPoint,
  orbitScale,
} from '@/features/auth/model/mascot-orbit';
import {
  INITIAL_POSE,
  applyEvent,
  createTimerBook,
  inspection,
  restingPose,
  welcomeTimeline,
  type MascotPose,
} from '@/features/auth/model/welcome-choreography';

function playUntil(at: number, count: number): MascotPose {
  return welcomeTimeline(count)
    .events.filter((item) => item.at <= at)
    .reduce(applyEvent, INITIAL_POSE);
}

describe('the welcome mascot plays one ordered greeting', () => {
  test('the events run in time order and end in a settled orbit with every module out', () => {
    const { events } = welcomeTimeline(3);
    const times = events.map((item) => item.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    const end = events.reduce(applyEvent, INITIAL_POSE);
    expect(end.revealed).toBe(3);
    expect(end.orbiting).toBe(true);
    expect(end.settled).toBe(true);
    expect(end.hat).toBe('on');
    expect(end.lens).toBe('side');
    expect(end.expression).toBe('neutral');
  });

  test('it greets with happy eyes and empty hands before anything leaves its back', () => {
    const greeting = playUntil(MASCOT_TIMING.greet, 3);
    expect(greeting.expression).toBe('smile');
    expect(greeting.greeting).toBe(true);
    expect(greeting.hat).toBe('none');
    expect(greeting.lens).toBe('none');
  });

  test('the hat and the lens come out from behind and only then sit in front', () => {
    expect(playUntil(MASCOT_TIMING.tuck, 3)).toMatchObject({
      hat: 'hide',
      lens: 'hide',
      pulling: true,
    });
    expect(playUntil(MASCOT_TIMING.reach, 3)).toMatchObject({ hat: 'above', lens: 'emerge' });
    expect(playUntil(MASCOT_TIMING.hatOn, 3)).toMatchObject({
      hat: 'on',
      lens: 'side',
      pulling: false,
    });
  });

  test('each module is revealed before the mascot looks at it through the lens', () => {
    const { events } = welcomeTimeline(3);
    [0, 1, 2].forEach((index) => {
      const reveal = events.find((item) => item.change.revealed === index + 1);
      const peer = events.find(
        (item) => item.change.lens === 'lift' && item.at > (reveal?.at ?? 0)
      );
      expect(reveal).toBeDefined();
      expect(peer?.change.expression).toBe('peer');
    });
  });

  test('an inspection attends, lifts the lens with the peering eyes and puts it back', () => {
    const steps = inspection(2, 1000, 1900);
    const pose = steps.reduce(applyEvent, restingPose(3));
    expect(steps[0]?.change).toEqual({ look: 2, attending: true });
    expect(steps[1]?.change).toMatchObject({
      lens: 'lift',
      rightArm: 'lifted',
      expression: 'peer',
    });
    expect(pose).toMatchObject({
      look: 2,
      attending: false,
      lens: 'side',
      rightArm: 'rest',
      expression: 'neutral',
    });
    expect(pose.wobble).toBe(2);
  });

  test('reduced motion rests with the hat on and every module placed', () => {
    expect(restingPose(4)).toMatchObject({ hat: 'on', lens: 'side', revealed: 4, orbiting: false });
  });
});

describe('the module orbit is a tilted ring', () => {
  test('the first module starts on the left and the ring is flattened by its tilt', () => {
    const first = orbitPoint(orbitAngle(0, 3, 0));
    expect(first.x).toBeCloseTo(-150, 5);
    expect(first.y).toBeCloseTo(0, 5);
    const front = orbitPoint(90);
    expect(front.y).toBeCloseTo(150 * 0.53, 5);
    expect(front.depth).toBeCloseTo(1, 5);
  });

  test('modules in front are larger than the ones passing behind', () => {
    expect(orbitScale(1)).toBeGreaterThan(orbitScale(-1));
  });

  test('the gaze points where the module is', () => {
    const right = gazeDirection(0);
    expect(right.x).toBeCloseTo(1, 5);
    expect(gazeDirection(90).y).toBeCloseTo(0.53, 5);
  });
});

describe('the timer book keeps only live handles', () => {
  const fakeClock = () => {
    const live = new Map<ReturnType<typeof setTimeout>, () => void>();
    let next = 0;
    return {
      clock: {
        setTimeout: (run: () => void, _ms: number) => {
          const handle = next++ as unknown as ReturnType<typeof setTimeout>;
          live.set(handle, run);
          return handle;
        },
        clearTimeout: (handle: ReturnType<typeof setTimeout>) => {
          live.delete(handle);
        },
      },
      fireOne: () => {
        const first = live.entries().next();
        if (first.done) return false;
        const [handle, run] = first.value;
        live.delete(handle);
        run();
        return true;
      },
      pending: () => live.size,
    };
  };

  test('a fired handle leaves the book, so a screen left open stays bounded', () => {
    const { clock, fireOne, pending } = fakeClock();
    const book = createTimerBook(clock);
    const count = 3;
    const schedule = (events: readonly { at: number }[]) => {
      events.forEach((item) => book.after(item.at, () => undefined));
    };
    const inspect = (look: number, at: number) => {
      book.after(at, () => {
        schedule(inspection(look % count, 0, MASCOT_TIMING.orbitHold));
        inspect(look + 1, MASCOT_TIMING.inspectEvery);
      });
    };
    const timeline = welcomeTimeline(count);
    schedule(timeline.events);
    inspect(0, timeline.inspectFrom);
    for (let step = 0; step < 5000; step += 1) {
      if (!fireOne()) break;
    }
    expect(book.size()).toBeLessThanOrEqual(4);
    book.clear();
    expect(book.size()).toBe(0);
    expect(pending()).toBe(0);
  });

  test('clearing drops every live handle and the clock agrees', () => {
    const { clock, pending } = fakeClock();
    const book = createTimerBook(clock);
    book.after(10, () => undefined);
    book.after(20, () => undefined);
    expect(book.size()).toBe(2);
    book.clear();
    expect(book.size()).toBe(0);
    expect(pending()).toBe(0);
  });
});
