import { describe, expect, test } from 'bun:test';
import { answeredOffer, resultOfFrame, shownResults } from '@/features/voice/model/argus-result';
import type { ReminderResult } from '@/features/voice/model/argus-result';
import {
  applyResultFrame,
  mergeResult,
  resultsOfRows,
  threadResultsOf,
} from '@/features/voice/model/result-merge';

const AT = 1_000;

const frame = (tool: string, data: Record<string, unknown>, ok = true) => ({
  id: 9,
  tool,
  ok,
  data,
});

describe('one card per result id', () => {
  test('a no or a failed save, ok false with the offer id, settles the asking card and never drops it', () => {
    const offer = resultOfFrame(
      frame('memory.remind', { title: 'Pagar el agua', remindAt: 1_800, confirm: true }),
      AT
    ) as ReminderResult;
    const settled = applyResultFrame(offer, frame('memory.remind', {}, false), AT + 5);
    expect(settled).toMatchObject({ id: 'result:9', at: AT, asking: false, status: 'failed' });
    expect(shownResults(settled ? [settled] : [])).toHaveLength(1);
    expect(applyResultFrame(undefined, frame('memory.remind', {}, false), AT)).toBeNull();
  });

  test('the kept reminder replaces the asking card with the same id', () => {
    const offer = resultOfFrame(
      frame('memory.remind', { title: 'Pagar el agua', remindAt: 1_800, confirm: true }),
      AT
    ) as ReminderResult;
    const kept = applyResultFrame(
      answeredOffer(offer, 'yes'),
      frame('memory.remind', { title: 'Pagar el agua', remindAt: 1_800 }),
      AT + 5
    );
    expect(kept).toMatchObject({ at: AT, asking: false, status: 'done' });
  });

  test('a settled card never goes back to asking, whichever transport repeats the offer', () => {
    const offer = resultOfFrame(
      frame('memory.remind', { title: 'Pagar el agua', remindAt: 1_800, confirm: true }),
      AT
    ) as ReminderResult;
    const answered = answeredOffer(offer, 'no');
    expect(mergeResult(answered, offer)).toEqual(answered);
    const failed = { ...answered, status: 'failed' as const };
    expect(mergeResult(failed, answered)).toEqual(failed);
    expect(mergeResult(undefined, offer)).toEqual(offer);
  });
});

describe('the results kept with the conversation', () => {
  const offerFrame = {
    id: 'ab12',
    tool: 'memory.remind',
    ok: true,
    data: { title: 'Regar', remindAt: 1_800, confirm: true },
  };

  test('each card sits on the line that first carried it, with the state of the latest line', () => {
    const placed = resultsOfRows([
      { id: '10', at: 1_000, frames: [offerFrame] },
      { id: '12', at: 2_000, frames: [{ ...offerFrame, ok: false, data: {} }] },
      {
        id: '14',
        at: 3_000,
        frames: [frame('app.set_guard_mode', { mode: 'night', previousMode: 'home' }), 'junk'],
      },
    ]);
    expect([...placed.keys()]).toEqual(['result:ab12', 'result:9']);
    expect(placed.get('result:ab12')).toMatchObject({
      anchor: '10',
      result: { at: 1_000, asking: false, status: 'failed' },
    });
    expect(placed.get('result:9')).toMatchObject({ anchor: '14', result: { kind: 'guard-mode' } });
  });

  test('an offer never answered stays an open question', () => {
    const placed = resultsOfRows([{ id: '10', at: 1_000, frames: [offerFrame] }]);
    expect(placed.get('result:ab12')?.result).toMatchObject({ asking: true, offerId: 'ab12' });
  });
});

describe('the live cards of this session joined with the thread', () => {
  test('a live card the rows already carry joins its line; the others wait for anchoring', () => {
    const offer = {
      id: 'ab12',
      tool: 'memory.remind',
      ok: true,
      data: { title: 'Regar', remindAt: 1_800, confirm: true },
    };
    const live = answeredOffer(resultOfFrame(offer, 5_000) as ReminderResult, 'yes');
    const other = resultOfFrame(frame('app.set_guard_mode', { mode: 'away' }), 6_000);
    const joined = threadResultsOf(
      [{ id: '10', at: 1_000, frames: [offer] }],
      other ? [live, other] : [live]
    );
    expect(joined.placed).toMatchObject([
      { anchor: '10', result: { id: 'result:ab12', at: 1_000, answer: 'yes', asking: false } },
    ]);
    expect(joined.unplaced.map((result) => result.kind)).toEqual(['guard-mode']);
  });
});
