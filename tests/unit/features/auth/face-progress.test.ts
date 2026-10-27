import { describe, expect, test } from 'bun:test';
import { FACE_TICK_COUNT } from '@/features/auth/constants/face.constant';
import { tickPath, sweepStep } from '@/features/auth/model/face-finder';
import { faceLoginCopyOf } from '@/features/auth/model/face-login';
import { faceProgressOf, litTicks } from '@/features/auth/model/face-progress';

const at = (patch: Partial<Parameters<typeof faceProgressOf>[0]>) =>
  faceProgressOf({ phase: 'guide', guide: null, capturing: false, done: false, ...patch });

describe('the face capture reports its own progress', () => {
  test('the ring stays empty and the cue guides until the face is ready', () => {
    expect(at({})).toEqual({ progress: 0, cue: 'screens.face.cue.centre', tone: 'calm' });
    expect(at({ guide: 'too-far' }).cue).toBe('screens.face.cue.closer');
    expect(at({ guide: 'low-light' })).toMatchObject({ progress: 0, tone: 'attn' });
    expect(at({ guide: 'multiple-faces' }).cue).toBe('screens.face.cue.alone');
  });

  test('a held face, the capture and the upload fill the ring in that order', () => {
    const hold = at({ guide: 'ready' }).progress;
    const capture = at({ phase: 'countdown', guide: 'ready' }).progress;
    const sending = at({ phase: 'submitting' }).progress;
    expect(hold).toBeGreaterThan(0);
    expect(capture).toBeGreaterThan(hold);
    expect(sending).toBeGreaterThan(capture);
    expect(at({ capturing: true }).progress).toBe(capture);
  });

  test('a known face completes the ring and says so', () => {
    expect(at({ done: true })).toEqual({ progress: 1, cue: 'screens.face.cue.done', tone: 'ok' });
  });

  test('the progress maps onto whole ticks', () => {
    expect(litTicks(0)).toBe(0);
    expect(litTicks(0.5)).toBe(FACE_TICK_COUNT / 2);
    expect(litTicks(2)).toBe(FACE_TICK_COUNT);
    expect(litTicks(-1)).toBe(0);
  });
});

describe('the finder ring', () => {
  test('draws one segment per lit tick', () => {
    const ring = { size: 100, inner: 0.4, outer: 0.5 };
    expect(tickPath(ring).match(/M/g)).toHaveLength(FACE_TICK_COUNT);
    expect(tickPath({ ...ring, count: 3 }).match(/M/g)).toHaveLength(3);
    expect(tickPath({ ...ring, count: 0 })).toBe('');
    expect(tickPath(ring).startsWith('M50.00 10.00L50.00 0.00')).toBe(true);
  });

  test('sweeps towards its target without overshooting', () => {
    expect(sweepStep(0, 10, 3)).toBe(3);
    expect(sweepStep(9, 10, 3)).toBe(10);
    expect(sweepStep(10, 0, 3)).toBe(7);
    expect(sweepStep(5, 5, 3)).toBe(5);
  });
});

describe('the sign-in copy', () => {
  const calm = at({});
  const recognising = at({ guide: 'ready' });

  test('greets, or welcomes back after a reinstall', () => {
    expect(faceLoginCopyOf({ restoring: false, failed: false, progress: calm })).toMatchObject({
      title: 'screens.face.login.title',
      chip: 'screens.face.cue.centre',
      chipTone: 'default',
    });
    expect(faceLoginCopyOf({ restoring: true, failed: false, progress: calm }).title).toBe(
      'screens.face.login.restore-title'
    );
  });

  test('says it is recognising once the face is held', () => {
    expect(
      faceLoginCopyOf({ restoring: false, failed: false, progress: recognising })
    ).toMatchObject({
      chip: 'screens.face.login.recognising',
      chipTone: 'ok',
    });
  });

  test('a failed attempt names what to fix, in attention', () => {
    expect(
      faceLoginCopyOf({ restoring: false, failed: true, progress: at({ guide: 'low-light' }) })
    ).toEqual({
      title: 'screens.face.login.failed-title',
      lead: 'screens.face.login.failed-lead',
      chip: 'screens.face.cue.light',
      chipTone: 'attn',
      chipIcon: 'alert',
    });
  });
});
