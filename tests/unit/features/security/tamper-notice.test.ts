import { describe, expect, test } from 'bun:test';
import {
  evidenceTargetOf,
  sightNoticeCopy,
  sightNoticeOf,
  sightNoticeTitle,
  tamperStatusOf,
} from '@/features/security/model/tamper-notice';
import type { TranslateFn } from '@/core/types';

const echo = ((key: string, params?: Record<string, string>) =>
  params ? `${key}${JSON.stringify(params)}` : key) as unknown as TranslateFn;

describe('tamper statuses', () => {
  test('every wire status is read, and defocused is read as blurred', () => {
    for (const status of ['covered', 'whiteout', 'blinded', 'partial_cover', 'blurred', 'moved', 'dark_sudden', 'unreachable']) {
      expect(tamperStatusOf(status)).toBe(status as ReturnType<typeof tamperStatusOf>);
    }
    expect(tamperStatusOf('defocused')).toBe('blurred');
    expect(tamperStatusOf('melted')).toBeNull();
    expect(tamperStatusOf(3)).toBeNull();
  });
});

describe('guard_tamper notices', () => {
  const data = {
    kind: 'guard_tamper',
    tamperStatus: 'covered',
    group: false,
    cameraId: 4,
    cameraName: 'Patio',
    onsetAt: 1_760_000_000,
    seenPersonName: '',
    maintenance: '',
    canClaim: true,
    incidentId: 31,
  };

  test('one camera reads its name and the kind of loss', () => {
    const notice = sightNoticeOf('guard_tamper', data);
    expect(notice).toMatchObject({ kind: 'tamper', status: 'covered', canClaim: true, incidentId: 31 });
    const copy = notice ? sightNoticeCopy(notice) : null;
    expect(copy).toEqual({ key: 'tamper-one', camera: 'Patio', status: 'covered' });
    expect(copy ? sightNoticeTitle(copy, echo) : '').toBe(
      'screens.security.tamper.lost-typed{"camera":"Patio","type":"screens.security.tamper.status.covered"}',
    );
  });

  test('several cameras at once read as a group', () => {
    const notice = sightNoticeOf('guard_tamper', { ...data, group: true, cameraIds: [4, 5, 6], cameraCount: 3 });
    expect(notice ? sightNoticeCopy(notice) : null).toEqual({ key: 'tamper-group', count: '3' });
  });

  test('a household face near the lens reads as probable maintenance', () => {
    const notice = sightNoticeOf('guard_tamper', { ...data, maintenance: 'probable', seenPersonName: 'Ana' });
    expect(notice ? sightNoticeCopy(notice) : null).toEqual({ key: 'tamper-probable', person: 'Ana', camera: 'Patio' });
  });

  test('the evidence target needs a camera and an onset', () => {
    expect(evidenceTargetOf(sightNoticeOf('guard_tamper', data))).toEqual({ cameraId: 4, onsetAt: 1_760_000_000 });
    expect(evidenceTargetOf(sightNoticeOf('guard_tamper', { ...data, onsetAt: 0 }))).toBeNull();
    expect(evidenceTargetOf(null)).toBeNull();
  });
});

describe('the other sight notices', () => {
  test('the home question carries its ask id', () => {
    expect(sightNoticeOf('guard_tamper_ask', { askId: 12, cameraId: 4, cameraName: 'Sala' })).toEqual({
      kind: 'ask',
      askId: 12,
      cameraId: 4,
      cameraName: 'Sala',
    });
    expect(sightNoticeOf('guard_tamper_ask', { cameraId: 4 })).toBeNull();
  });

  test('the view check carries its window and camera', () => {
    expect(sightNoticeOf('maintenance_view_check', { maintenanceId: 3, cameraId: 4, cameraName: 'Sala' })).toEqual({
      kind: 'view-check',
      maintenanceId: 3,
      cameraId: 4,
      cameraName: 'Sala',
    });
  });

  test('a dirty lens is informational', () => {
    const notice = sightNoticeOf('camera_maintenance_notice', { cameraId: 4, cameraName: 'Sala' });
    expect(notice ? sightNoticeCopy(notice) : null).toEqual({ key: 'lens', camera: 'Sala' });
  });

  test('older kinds keep their own rendering', () => {
    expect(sightNoticeOf('guard_episode', { cameraId: 4 })).toBeNull();
    expect(sightNoticeOf(null, {})).toBeNull();
  });
});
