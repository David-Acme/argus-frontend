import { describe, expect, test } from 'bun:test';
import type { VoiceAction } from '@/core/types';
import {
  INITIAL_CALL_BOUNDARY,
  boundaryAfterDone,
  boundaryAfterStop,
  boundaryExpired,
  hasAction,
  recordAction,
  settleAction,
} from '@/features/voice/model/voice-action-log';

const action = (id: string): VoiceAction => ({ id, name: 'app.set_guard_mode', arguments: { mode: 'night' } });

describe('the call action log', () => {
  test('an action is recorded once, pending, and the log keeps the newest', () => {
    const once = recordAction({ records: [], action: action('1'), kept: 2 });
    expect(once).toEqual([{ ...action('1'), status: 'pending', detail: null }]);
    expect(recordAction({ records: once, action: action('1'), kept: 2 })).toBe(once);
    const three = recordAction({
      records: recordAction({ records: once, action: action('2'), kept: 2 }),
      action: action('3'),
      kept: 2,
    });
    expect(three.map((record) => record.id)).toEqual(['2', '3']);
    expect(hasAction(three, '1')).toBe(false);
  });

  test('a result settles a pending action once and keeps the reason of a failure', () => {
    const pending = recordAction({ records: [], action: action('4'), kept: 5 });
    const failed = settleAction({ records: pending, id: '4', outcome: { ok: false, detail: 'sin conexión' } });
    expect(failed[0]).toMatchObject({ status: 'failed', detail: 'sin conexión' });
    expect(settleAction({ records: failed, id: '4', outcome: { ok: true, detail: null } })).toBe(failed);
    expect(settleAction({ records: pending, id: '9', outcome: { ok: true, detail: null } })).toBe(pending);
  });
});

describe('the boundary between two calls on one socket', () => {
  test('frames before the done of a stopped call belong to it, the done closes it', () => {
    const stopped = boundaryAfterStop(INITIAL_CALL_BOUNDARY, 1000);
    expect(stopped.pendingStops).toBe(1);
    const { boundary, previousCall } = boundaryAfterDone(stopped);
    expect(previousCall).toBe(true);
    expect(boundary.pendingStops).toBe(0);
    expect(boundaryAfterDone(boundary).previousCall).toBe(false);
  });

  test('a done that never comes stops holding back the next call after the grace', () => {
    const stopped = boundaryAfterStop(INITIAL_CALL_BOUNDARY, 1000);
    expect(boundaryExpired(stopped, 2000, 3000)).toBe(stopped);
    expect(boundaryExpired(stopped, 4000, 3000)).toEqual(INITIAL_CALL_BOUNDARY);
  });
});
