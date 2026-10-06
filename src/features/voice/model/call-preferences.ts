import type { CallLanguage, CallPreferences, CallTrigger } from '@/core/types';

export const CALL_TRIGGERS: readonly CallTrigger[] = [
  'guardCritical',
  'guardIntruder',
  'guardEscalation',
  'guardArrival',
  'agenda',
  'assistant',
];

const TRIGGER_MODULES: Readonly<Record<CallTrigger, string>> = {
  guardCritical: 'surveillance',
  guardIntruder: 'surveillance',
  guardEscalation: 'surveillance',
  guardArrival: 'surveillance',
  agenda: 'productivity',
  assistant: 'core',
};

export const triggersOf = (moduleActive: (moduleId: string) => boolean): CallTrigger[] =>
  CALL_TRIGGERS.filter((trigger) => moduleActive(TRIGGER_MODULES[trigger]));

export type QuietPreset = 'off' | 'night' | 'late' | 'custom';

export type DndChoice = 'off' | 'hour' | 'morning';

const QUIET_HOURS: Readonly<Record<Exclude<QuietPreset, 'off' | 'custom'>, [number, number]>> = {
  night: [22, 7],
  late: [23, 8],
};

const MORNING_HOUR = 8;
const HOUR_SECONDS = 3600;

export function quietPresetOf(
  preferences: Pick<CallPreferences, 'quietStartHour' | 'quietEndHour'>
): QuietPreset {
  const { quietStartHour: start, quietEndHour: end } = preferences;
  if (start < 0 || end < 0 || start === end) return 'off';
  for (const [preset, [from, to]] of Object.entries(QUIET_HOURS)) {
    if (from === start && to === end) return preset as QuietPreset;
  }
  return 'custom';
}

export function quietHoursFor(
  preset: Exclude<QuietPreset, 'custom'>
): Pick<CallPreferences, 'quietStartHour' | 'quietEndHour'> {
  if (preset === 'off') return { quietStartHour: -1, quietEndHour: -1 };
  const [quietStartHour, quietEndHour] = QUIET_HOURS[preset];
  return { quietStartHour, quietEndHour };
}

export function dndUntilFor(choice: DndChoice, now: Date): number {
  const seconds = Math.floor(now.getTime() / 1000);
  if (choice === 'off') return 0;
  if (choice === 'hour') return seconds + HOUR_SECONDS;
  const morning = new Date(now);
  morning.setHours(MORNING_HOUR, 0, 0, 0);
  if (morning.getTime() <= now.getTime()) morning.setDate(morning.getDate() + 1);
  return Math.floor(morning.getTime() / 1000);
}

export function dndActive(preferences: Pick<CallPreferences, 'dndUntil'>, nowMs: number): boolean {
  return preferences.dndUntil * 1000 > nowMs;
}

export function environmentMuted(
  preferences: Pick<CallPreferences, 'mutedEnvironmentIds'>,
  id: number
): boolean {
  return preferences.mutedEnvironmentIds.includes(id);
}

export function toggledEnvironments(
  preferences: Pick<CallPreferences, 'mutedEnvironmentIds'>,
  id: number,
  muted: boolean
): number[] {
  const rest = preferences.mutedEnvironmentIds.filter((entry) => entry !== id);
  return muted ? [...rest, id] : rest;
}

export function dndChoiceOf(preferences: Pick<CallPreferences, 'dndUntil'>, now: Date): DndChoice {
  if (!dndActive(preferences, now.getTime())) return 'off';
  return Math.abs(preferences.dndUntil - dndUntilFor('morning', now)) < 60 ? 'morning' : 'hour';
}

export const AGENDA_LEADS: readonly number[] = [0, 5, 10, 15, 30, 60];
export const RING_SECONDS: readonly number[] = [20, 30, 45, 60, 90];
export const PUSH_DELAYS: readonly number[] = [0, 4, 10, 30];
export const CALL_LANGUAGES: readonly CallLanguage[] = ['', 'es', 'en'];
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const ALL_DAYS = 127;

export function withCurrent(presets: readonly number[], current: number): number[] {
  return presets.includes(current) ? [...presets] : [...presets, current].sort((a, b) => a - b);
}

export function quietDayOn(mask: number, day: number): boolean {
  return (mask & (1 << day)) !== 0;
}

export function toggledQuietDay(mask: number, day: number): number {
  return mask ^ (1 << day);
}
