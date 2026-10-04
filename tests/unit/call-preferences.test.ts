import { describe, expect, test } from 'bun:test';
import { callPreferencesSchema } from '@/core/contracts/rtc.contract';
import {
  dndActive,
  dndChoiceOf,
  dndUntilFor,
  quietHoursFor,
  quietPresetOf,
  toggledEnvironments,
} from '@/features/voice/model/call-preferences';

const defaults = {
  userId: 7,
  enabled: true,
  guardCritical: 'call',
  guardIntruder: 'call',
  guardEscalation: 'call',
  guardArrival: 'off',
  agenda: 'call',
  assistant: 'call',
  quietStartHour: -1,
  quietEndHour: -1,
  dndUntil: 0,
  criticalBypass: true,
  mutedEnvironmentIds: [],
  updatedAt: 0,
};

describe('call preferences', () => {
  test('the server row parses and a foreign mode is refused', () => {
    expect(callPreferencesSchema.parse(defaults).guardArrival).toBe('off');
    expect(callPreferencesSchema.safeParse({ ...defaults, agenda: 'ring' }).success).toBe(false);
    expect(callPreferencesSchema.safeParse({ ...defaults, quietStartHour: 24 }).success).toBe(
      false
    );
  });

  test('quiet hours read as presets and write back', () => {
    expect(quietPresetOf(defaults)).toBe('off');
    expect(quietPresetOf({ quietStartHour: 22, quietEndHour: 7 })).toBe('night');
    expect(quietPresetOf({ quietStartHour: 23, quietEndHour: 8 })).toBe('late');
    expect(quietPresetOf({ quietStartHour: 21, quietEndHour: 6 })).toBe('custom');
    expect(quietPresetOf({ quietStartHour: 5, quietEndHour: 5 })).toBe('off');
    expect(quietHoursFor('night')).toEqual({ quietStartHour: 22, quietEndHour: 7 });
    expect(quietHoursFor('off')).toEqual({ quietStartHour: -1, quietEndHour: -1 });
  });

  test('do not disturb lasts an hour or until the next morning', () => {
    const evening = new Date(2026, 9, 4, 21, 30);
    const hour = dndUntilFor('hour', evening);
    expect(hour - Math.floor(evening.getTime() / 1000)).toBe(3600);
    const morning = new Date(dndUntilFor('morning', evening) * 1000);
    expect([morning.getDate(), morning.getHours()]).toEqual([5, 8]);
    const dawn = new Date(2026, 9, 4, 6, 0);
    expect(new Date(dndUntilFor('morning', dawn) * 1000).getDate()).toBe(4);
    expect(dndUntilFor('off', evening)).toBe(0);
    expect(dndActive({ dndUntil: hour }, evening.getTime())).toBe(true);
    expect(dndChoiceOf({ dndUntil: hour }, evening)).toBe('hour');
    expect(dndChoiceOf({ dndUntil: dndUntilFor('morning', evening) }, evening)).toBe('morning');
    expect(dndChoiceOf({ dndUntil: 0 }, evening)).toBe('off');
  });

  test('environments toggle in and out of the muted list', () => {
    expect(toggledEnvironments({ mutedEnvironmentIds: [2] }, 3, true)).toEqual([2, 3]);
    expect(toggledEnvironments({ mutedEnvironmentIds: [2, 3] }, 3, false)).toEqual([2]);
    expect(toggledEnvironments({ mutedEnvironmentIds: [3] }, 3, true)).toEqual([3]);
  });
});
