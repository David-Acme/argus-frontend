import type { CallMode, CallTrigger, TranslationKey } from '@/core/types';
import type { DndChoice, QuietPreset, WeekDay } from '@/features/voice/model/call-preferences';

export type TriggerText = { label: TranslationKey; hint: TranslationKey };

export const CALL_MODE_LABEL: Readonly<Record<CallMode, TranslationKey>> = {
  call: 'screens.voice.preferences.mode.call',
  notify: 'screens.voice.preferences.mode.notify',
  off: 'screens.voice.preferences.mode.off',
};

export const CALL_TRIGGER_TEXT: Readonly<Record<CallTrigger, TriggerText>> = {
  guardCritical: {
    label: 'screens.voice.preferences.trigger.guardCritical',
    hint: 'screens.voice.preferences.trigger-hint.guardCritical',
  },
  guardIntruder: {
    label: 'screens.voice.preferences.trigger.guardIntruder',
    hint: 'screens.voice.preferences.trigger-hint.guardIntruder',
  },
  guardEscalation: {
    label: 'screens.voice.preferences.trigger.guardEscalation',
    hint: 'screens.voice.preferences.trigger-hint.guardEscalation',
  },
  guardArrival: {
    label: 'screens.voice.preferences.trigger.guardArrival',
    hint: 'screens.voice.preferences.trigger-hint.guardArrival',
  },
  agenda: {
    label: 'screens.voice.preferences.trigger.agenda',
    hint: 'screens.voice.preferences.trigger-hint.agenda',
  },
  assistant: {
    label: 'screens.voice.preferences.trigger.assistant',
    hint: 'screens.voice.preferences.trigger-hint.assistant',
  },
};

export const DAY_LABEL: Readonly<Record<WeekDay, TranslationKey>> = {
  0: 'screens.voice.preferences.days.sun',
  1: 'screens.voice.preferences.days.mon',
  2: 'screens.voice.preferences.days.tue',
  3: 'screens.voice.preferences.days.wed',
  4: 'screens.voice.preferences.days.thu',
  5: 'screens.voice.preferences.days.fri',
  6: 'screens.voice.preferences.days.sat',
};

export const QUIET_LABEL: Readonly<Record<Exclude<QuietPreset, 'custom'>, TranslationKey>> = {
  off: 'screens.voice.preferences.quiet.off',
  night: 'screens.voice.preferences.quiet.night',
  late: 'screens.voice.preferences.quiet.late',
};

export const DND_LABEL: Readonly<Record<DndChoice, TranslationKey>> = {
  off: 'screens.voice.preferences.dnd.off',
  hour: 'screens.voice.preferences.dnd.hour',
  morning: 'screens.voice.preferences.dnd.morning',
};
