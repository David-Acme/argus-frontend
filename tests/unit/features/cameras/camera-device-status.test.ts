import { describe, expect, test } from 'bun:test';
import type { ICameraDeviceStatus, IServiceResponse } from '@/core/interfaces';
import {
  optimisticStatus,
  resolvedStatus,
} from '@/features/cameras/model/camera-device';

const previous: ICameraDeviceStatus = {
  ok: true,
  model: 'C225',
  firmware: '1.3.9',
  privacyEnabled: false,
  ledEnabled: true,
  motionEnabled: true,
  motionSensitivity: 60,
  sdCard: { status: 'normal', total: '128G', free: '90G' },
};

const answered = (info: ICameraDeviceStatus | null): IServiceResponse<ICameraDeviceStatus> => ({
  status: 200,
  ok: true,
  info,
  errors: null,
});

describe('the device status the settings rows show', () => {
  test('a change lands on a copy and keeps every field it did not touch', () => {
    const next = optimisticStatus(previous, { privacy: true });
    expect(next).toEqual({ ...previous, privacyEnabled: true });
    expect(next).not.toBe(previous);
    expect(previous.privacyEnabled).toBe(false);
  });

  test('a body without a field keeps the value that was known', () => {
    const next = optimisticStatus(previous, { led: false });
    expect(next.ledEnabled).toBe(false);
    expect(next.privacyEnabled).toBe(false);
    expect(next.motionSensitivity).toBe(60);
    expect(next.sdCard).toEqual(previous.sdCard);
  });

  test('with nothing known yet the body is all there is', () => {
    expect(optimisticStatus(null, { privacy: true })).toEqual({ privacyEnabled: true });
  });

  test('a refused or cancelled change rolls back to the state that was there', () => {
    const optimistic = optimisticStatus(previous, { privacy: true });
    const rolledBack = resolvedStatus({ response: null, previous, body: { privacy: true } });
    expect(rolledBack).toBe(previous);
    expect(rolledBack).not.toBe(optimistic);
    expect(optimistic.privacyEnabled).toBe(true);
  });

  test('the state stays as the camera answered it', () => {
    const answer = { ...previous, privacyEnabled: true, ledEnabled: false };
    expect(resolvedStatus({ response: answered(answer), previous, body: { privacy: true } })).toBe(answer);
  });

  test('an answer with no state falls back to the change that was asked for', () => {
    expect(resolvedStatus({ response: answered(null), previous, body: { privacy: true } })).toEqual({
      ...previous,
      privacyEnabled: true,
    });
  });
});
