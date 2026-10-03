import { describe, expect, test } from 'bun:test';
import { activityTrend } from '@/features/home/model/activity-trend';

describe('activityTrend', () => {
  test('an unchanged week shows the count and stays flat', () => {
    expect(activityTrend({ eventsCurrent: 4, eventsPrevious: 4 }, 'es')).toEqual({ label: '4', direction: 'flat' });
  });

  test('a first active week shows the absolute rise', () => {
    expect(activityTrend({ eventsCurrent: 3, eventsPrevious: 0 }, 'en')).toEqual({ label: '+3', direction: 'up' });
  });

  test('a change is a signed percentage in the reader locale', () => {
    expect(activityTrend({ eventsCurrent: 9, eventsPrevious: 8 }, 'en')).toEqual({ label: '+12.5%', direction: 'up' });
    const spanish = activityTrend({ eventsCurrent: 7, eventsPrevious: 8 }, 'es');
    expect(spanish.direction).toBe('down');
    expect(spanish.label.replace(/\s/g, ' ')).toBe('-12,5 %');
  });
});
