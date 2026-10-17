import { describe, expect, test } from 'bun:test';
import type { IServiceResponse } from '@/core/interfaces';
import type { ResourceNotice, SafetyStatus } from '@/core/types';
import {
  bindSafetyMemo,
  forgetsPinMemo,
  needsPin,
} from '@/features/safety/services/safety-memo';

const notice = (scope: ResourceNotice['scope']): ResourceNotice => ({
  domain: 'guard',
  scope,
  ids: [],
});

const known = (hasPin: boolean): SafetyStatus => ({
  duressEnabled: true,
  hasPin,
  hasPhrase: false,
  alertsReach: null,
  maskedCameras: [],
});

const answer = (
  hasPin: boolean,
  ok = true
): IServiceResponse<SafetyStatus> => ({
  status: ok ? 200 : 0,
  ok,
  info: ok ? known(hasPin) : null,
  errors: null,
});

describe('the safety PIN memo', () => {
  test('a PIN notice and a duress notice forget it, anything else does not', () => {
    const listeners: ((item: ResourceNotice) => void)[] = [];
    const reconnects: (() => void)[] = [];
    let forgets = 0;
    bindSafetyMemo(
      {
        onChanged: (listener: (item: ResourceNotice) => void) => {
          listeners.push(listener);
          return () => {};
        },
        onReconnected: (listener: () => void) => {
          reconnects.push(listener);
          return () => {};
        },
      },
      {
        forget: () => {
          forgets += 1;
        },
      }
    );

    for (const listener of listeners) listener(notice('safety_pin'));
    expect(forgets).toBe(1);
    for (const listener of listeners) listener(notice('duress'));
    expect(forgets).toBe(2);
    for (const listener of listeners) listener(notice('episodes'));
    expect(forgets).toBe(2);

    for (const reconnect of reconnects) reconnect();
    expect(forgets).toBe(3);
  });

  test('the scope of a notice decides on its own', () => {
    expect(forgetsPinMemo(notice('safety_pin'))).toBe(true);
    expect(forgetsPinMemo(notice('duress'))).toBe(true);
    expect(forgetsPinMemo(notice('environments'))).toBe(false);
    expect(forgetsPinMemo({ domain: 'camera', scope: 'device', ids: [] })).toBe(false);
  });

  test('a memo answers, and a server that cannot answer asks for the PIN', () => {
    expect(needsPin(known(true), null)).toBe(true);
    expect(needsPin(known(false), null)).toBe(false);
    expect(needsPin(null, answer(true))).toBe(true);
    expect(needsPin(null, answer(false))).toBe(false);

    expect(needsPin(null, null)).toBe(true);
    expect(needsPin(null, answer(false, false))).toBe(true);
    expect(needsPin(null, { status: 200, ok: true, info: null, errors: null })).toBe(true);
  });
});
