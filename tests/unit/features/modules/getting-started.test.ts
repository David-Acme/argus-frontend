import { describe, expect, test } from 'bun:test';
import { projectGettingStarted } from '@/core/services/view-cache/getting-started.projection';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import {
  EMPTY_CHECKLIST,
  EMPTY_SIGNALS,
  completedBySignals,
  withSignals,
} from '@/features/modules/model/getting-started';

describe('getting-started steps follow the household data', () => {
  test('nothing is done in an empty household', () => {
    expect([...completedBySignals(EMPTY_SIGNALS)]).toEqual([]);
  });

  test('a camera, a zone, an event and a project complete their steps on any device', () => {
    const done = completedBySignals({ ...EMPTY_SIGNALS, cameras: 1, zones: 2, events: 3, projects: 1 });
    expect([...done].sort()).toEqual(['add-camera', 'draw-zone', 'first-event', 'first-project']);
  });

  test('the owner alone has not invited anyone; a second person or an invitation has', () => {
    expect(completedBySignals({ ...EMPTY_SIGNALS, people: 1 }).has('invite-people')).toBe(false);
    expect(completedBySignals({ ...EMPTY_SIGNALS, people: 2 }).has('invite-people')).toBe(true);
    expect(completedBySignals({ ...EMPTY_SIGNALS, people: 1, invitations: 1 }).has('invite-people')).toBe(true);
  });

  test('signals add to what the person marked by hand and keep the hidden list', () => {
    const state = { hidden: ['meet-argus'], done: ['guard-mode'] };
    const merged = withSignals(state, { ...EMPTY_SIGNALS, cameras: 1 });
    expect(merged.done).toEqual(['guard-mode', 'add-camera']);
    expect(merged.hidden).toEqual(['meet-argus']);
    expect(withSignals(EMPTY_CHECKLIST, EMPTY_SIGNALS)).toBe(EMPTY_CHECKLIST);
  });

  test('the view-cache payload carries exactly the model signal shape', () => {
    const writes = projectGettingStarted({
      cameras: [1],
      zones: [1, 2],
      events: 3,
      projects: [1],
      people: [1, 2],
      invitations: [1],
    });
    const write = writes.find((item) => item.key === VIEW_CACHE_KEYS.gettingStartedSignals);
    if (!write || !('value' in write)) throw new Error('no getting-started signals written');
    expect(Object.keys(write.value as object).sort()).toEqual(Object.keys(EMPTY_SIGNALS).sort());
    expect(write.value).toEqual({
      cameras: 1,
      zones: 2,
      events: 3,
      projects: 1,
      people: 2,
      invitations: 1,
    });
  });
});
