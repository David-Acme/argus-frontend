import { describe, expect, test } from 'bun:test';
import { environmentResponseSchema } from '@/core/contracts/response.contract';
import type { EnvironmentResponseConfig, ResponseRecipient } from '@/core/types';
import {
  moveRecipient,
  normalizeSteps,
  silentOf,
  stepsOf,
  toUpdate,
  validEmergency,
  validPhone,
  withDuty,
  withMode,
} from '@/features/security/model/response-recipients';

const person = (
  userId: number,
  role: ResponseRecipient['role'],
  step: number,
  mode: ResponseRecipient['mode'] = 'call'
): ResponseRecipient => ({
  userId,
  name: `U${userId}`,
  role,
  mode,
  step,
  onDuty: false,
  customized: false,
  mandatory: false,
});

const household = [person(1, 'owner', 0), person(4, 'guard', 0), person(2, 'resident', 1), person(3, 'resident', 2)];

const ids = (list: readonly ResponseRecipient[]) => list.map((item) => item.userId);

describe('recipient steps', () => {
  test('steps group people and number them from zero', () => {
    const steps = stepsOf([person(1, 'owner', 0), person(2, 'resident', 4), person(3, 'resident', 9)]);
    expect(steps.map((group) => group.step)).toEqual([0, 1, 2]);
    expect(steps.map((group) => ids(group.recipients))).toEqual([[1], [2], [3]]);
  });

  test('people set to nothing are listed apart and hold no step', () => {
    const list = [...household, person(5, 'guest', 0, 'off')];
    expect(ids(silentOf(list))).toEqual([5]);
    expect(stepsOf(list).flatMap((group) => ids(group.recipients))).toEqual([1, 4, 2, 3]);
  });
});

describe('moving a recipient', () => {
  test('someone who shares a step moves into a step of their own', () => {
    const moved = moveRecipient(household, 4, 'later');
    expect(stepsOf(moved).map((group) => ids(group.recipients))).toEqual([[1], [4], [2], [3]]);
    const earlier = moveRecipient(household, 1, 'earlier');
    expect(stepsOf(earlier).map((group) => ids(group.recipients))).toEqual([[1], [4], [2], [3]]);
  });

  test('someone alone joins the neighbouring step', () => {
    const moved = moveRecipient(household, 2, 'earlier');
    expect(stepsOf(moved).map((group) => ids(group.recipients))).toEqual([[1, 4, 2], [3]]);
    expect(moved.find((item) => item.userId === 2)?.customized).toBe(true);
  });

  test('the ends stay put', () => {
    const solo = [person(1, 'owner', 0), person(2, 'resident', 1)];
    expect(stepsOf(moveRecipient(solo, 1, 'earlier')).map((g) => ids(g.recipients))).toEqual([[1], [2]]);
    expect(stepsOf(moveRecipient(solo, 2, 'later')).map((g) => ids(g.recipients))).toEqual([[1], [2]]);
  });
});

describe('modes and duty', () => {
  test('switching someone back on puts them last', () => {
    const off = withMode(household, 1, 'off');
    expect(ids(silentOf(off))).toEqual([1]);
    const back = withMode(off, 1, 'notify');
    const steps = stepsOf(back);
    expect(ids(steps.at(-1)?.recipients ?? [])).toEqual([1]);
    expect(back.find((item) => item.userId === 1)?.mode).toBe('notify');
  });

  test('a guard on duty is always called, or during staffed hours', () => {
    expect(withDuty(household, { userId: 4, onDuty: true, staffedNow: false }).find((i) => i.userId === 4)?.mandatory).toBe(true);
    expect(withDuty(household, { userId: 4, onDuty: false, staffedNow: true }).find((i) => i.userId === 4)?.mandatory).toBe(true);
    expect(withDuty(household, { userId: 4, onDuty: false, staffedNow: false }).find((i) => i.userId === 4)?.mandatory).toBe(false);
    expect(withDuty(household, { userId: 1, onDuty: true, staffedNow: true }).find((i) => i.userId === 1)?.mandatory).toBe(false);
  });
});

describe('the body the owner saves', () => {
  test('it carries every person with a compact step, and the contacts without ids', () => {
    const config: EnvironmentResponseConfig = {
      environmentId: 1,
      emergencyNumber: '105',
      stepSeconds: 60,
      staffedNow: false,
      recipients: [person(1, 'owner', 0), person(2, 'resident', 5)],
      contacts: [{ id: 3, name: 'Vecina', phone: '999', note: '' }],
    };
    expect(toUpdate(config)).toEqual({
      emergencyNumber: '105',
      stepSeconds: 60,
      recipients: [
        { userId: 1, mode: 'call', step: 0, onDuty: false },
        { userId: 2, mode: 'call', step: 1, onDuty: false },
      ],
      contacts: [{ name: 'Vecina', phone: '999', note: '' }],
    });
    expect(environmentResponseSchema.safeParse(config).success).toBe(true);
    expect(ids(normalizeSteps(config.recipients))).toEqual([1, 2]);
  });

  test('phones and emergency numbers are checked like the server does', () => {
    expect(validPhone('+51 (1) 555-0101')).toBe(true);
    expect(validPhone('call me')).toBe(false);
    expect(validPhone('12')).toBe(false);
    expect(validEmergency('')).toBe(true);
    expect(validEmergency('105')).toBe(true);
    expect(validEmergency('nine')).toBe(false);
  });
});
