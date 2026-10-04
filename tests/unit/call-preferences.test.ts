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
  agendaLeadMinutes: 10,
  quietDays: 127,
  ringSeconds: 45,
  pushDelaySeconds: 4,
  liveAnnounce: true,
  lang: '',
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

describe('call preferences, per-person timings', () => {
  test('a server value outside the presets is still offered', async () => {
    const { withCurrent, RING_SECONDS } = await import('@/features/voice/model/call-preferences');
    expect(withCurrent(RING_SECONDS, 45)).toEqual([20, 30, 45, 60, 90]);
    expect(withCurrent(RING_SECONDS, 50)).toEqual([20, 30, 45, 50, 60, 90]);
  });

  test('quiet days toggle one bit per weekday, Sunday is bit 0', async () => {
    const { quietDayOn, toggledQuietDay, ALL_DAYS } =
      await import('@/features/voice/model/call-preferences');
    expect(quietDayOn(ALL_DAYS, 0)).toBe(true);
    const weekdays = toggledQuietDay(toggledQuietDay(ALL_DAYS, 0), 6);
    expect(weekdays).toBe(0b0111110);
    expect(quietDayOn(weekdays, 0)).toBe(false);
    expect(quietDayOn(weekdays, 3)).toBe(true);
  });

  test('the per-person fields are required and bounded like the server', () => {
    expect(callPreferencesSchema.parse(defaults).ringSeconds).toBe(45);
    const { liveAnnounce, ...missing } = defaults;
    expect(liveAnnounce).toBe(true);
    expect(callPreferencesSchema.safeParse(missing).success).toBe(false);
    expect(callPreferencesSchema.safeParse({ ...defaults, lang: 'fr' }).success).toBe(false);
    expect(callPreferencesSchema.safeParse({ ...defaults, quietDays: 128 }).success).toBe(false);
    expect(callPreferencesSchema.safeParse({ ...defaults, agendaLeadMinutes: 20 }).success).toBe(
      false
    );
    expect(callPreferencesSchema.safeParse({ ...defaults, ringSeconds: 10 }).success).toBe(false);
    expect(callPreferencesSchema.safeParse({ ...defaults, pushDelaySeconds: 31 }).success).toBe(
      false
    );
  });
});
