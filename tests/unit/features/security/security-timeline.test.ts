import { describe, expect, test } from 'bun:test';
import { timelineRaised, timelineText } from '@/features/security/model/timeline';
import { t } from './security-fixtures';

describe('the episode timeline', () => {
  test('states say what Argus was doing', () => {
    expect(timelineText({ type: 'state', at: 1, state: 'observing', reason: '' }, t)).toBe(
      'Empezó a observar'
    );
    expect(timelineText({ type: 'state', at: 1, state: 'verifying', reason: '' }, t)).toBe(
      'Comprobando quién es'
    );
    expect(
      timelineText({ type: 'state', at: 1, state: 'closed', reason: 'known_resident' }, t)
    ).toBe('Era alguien de casa');
    expect(timelineText({ type: 'state', at: 1, state: 'closed', reason: 'left' }, t)).toBe(
      'Se fue'
    );
  });

  test('a decision says whether it alerted, why not, and how many times', () => {
    const decision = {
      type: 'decision' as const,
      at: 1,
      until: 2,
      danger: 'high' as const,
      suppression: '',
      notified: true,
      reasons: [],
      count: 1,
    };
    expect(timelineText(decision, t)).toBe('Te avisó · riesgo alto');
    expect(timelineRaised(decision)).toBe(true);
    expect(
      timelineText({ ...decision, notified: false, suppression: 'grouped', count: 3 }, t)
    ).toBe('Unido a un aviso anterior × 3');
    expect(timelineText({ ...decision, notified: false, suppression: 'other' }, t)).toBe(
      'Sin aviso · riesgo alto'
    );
    expect(timelineRaised({ ...decision, notified: false })).toBe(false);
  });

  test('an action says it happened or that it failed', () => {
    const action = { type: 'action' as const, at: 1, action: 'announce', status: 'succeeded' };
    expect(timelineText(action, t)).toBe('Habló por el altavoz');
    expect(timelineText({ ...action, status: 'failed' }, t)).toBe('No pudo hablar por el altavoz');
    expect(timelineText({ ...action, action: 'unknown' }, t)).toBe('Apagó la sirena');
  });
});
