import { describe, expect, test } from 'bun:test';
import type { IZoneCacheRow } from '@/core/interfaces';
import { zoneDraftOf, zoneProblem } from '@/features/cameras/model/zone-draft';

const point = { x: 0.2, y: 0.2 };

describe('a zone draft', () => {
  test('a new zone starts empty, watching, with the first colour', () => {
    expect(zoneDraftOf(null)).toEqual({
      name: '',
      zoneType: 'monitor',
      color: '#FF3B30',
      points: [],
    });
  });

  test('an existing zone is copied, never shared', () => {
    const zone: IZoneCacheRow = {
      id: 'z',
      cameraId: '3',
      name: 'Reja',
      points: [point],
      zoneType: 'alert',
      color: '',
      isEnabled: true,
    };
    const draft = zoneDraftOf(zone);
    expect(draft).toEqual({ name: 'Reja', zoneType: 'alert', color: '#FF3B30', points: [point] });
    expect(draft.points).not.toBe(zone.points);
  });

  test('a name and at least three points are needed', () => {
    const base = {
      name: 'Reja',
      zoneType: 'monitor',
      color: '#FF3B30',
      points: [point, point, point],
    } as const;
    expect(zoneProblem({ ...base, points: [...base.points] })).toBeNull();
    expect(zoneProblem({ ...base, name: '  ', points: [...base.points] })).toBe('name');
    expect(zoneProblem({ ...base, name: 'x'.repeat(121), points: [...base.points] })).toBe('name');
    expect(zoneProblem({ ...base, points: [point, point] })).toBe('points');
  });
});
