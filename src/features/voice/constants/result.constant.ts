import type { GuardMode, TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';
import type { AgendaDayItem, ArgusResultKind } from '@/features/voice/model/argus-result';
import type { ResultDay } from '@/features/voice/model/result-day';

export const GUARD_MODE_KEYS: Readonly<Record<GuardMode, TranslationKey>> = {
  home: 'screens.security.mode.home',
  night: 'screens.security.mode.night',
  away: 'screens.security.mode.away',
  armed: 'screens.security.mode.armed',
};

export const MODULE_NAME_KEYS: Readonly<Record<string, TranslationKey>> = {
  surveillance: 'screens.modules.catalog.surveillance.name',
  productivity: 'screens.modules.catalog.productivity.name',
};

export const SCREEN_NAME_KEYS: Readonly<Record<string, TranslationKey>> = {
  home: 'screens.voice.actions.screens.home',
  agenda: 'screens.voice.actions.screens.agenda',
  projects: 'screens.voice.actions.screens.projects',
  cameras: 'screens.voice.actions.screens.cameras',
  security: 'screens.voice.actions.screens.security',
  people: 'screens.voice.actions.screens.people',
  settings: 'screens.voice.actions.screens.settings',
  modules: 'screens.voice.actions.screens.modules',
};

export const RESULT_DAY_KEYS: Readonly<Record<Exclude<ResultDay, 'other'>, TranslationKey>> = {
  today: 'screens.voice.results.today',
  tomorrow: 'screens.voice.results.tomorrow',
  yesterday: 'screens.voice.results.yesterday',
};

export const RESULT_ICONS: Readonly<Record<ArgusResultKind, IconGlyph>> = {
  camera: 'cam',
  screen: 'up',
  reminder: 'bell',
  'event-moved': 'cal',
  'guard-mode': 'shield',
  'agenda-day': 'cal',
};

export const AGENDA_BAR_CLASSES: Readonly<Record<AgendaDayItem['kind'], string>> = {
  event: 'bg-ev3-bar',
  task: 'bg-ev2-bar',
  reminder: 'bg-ev1-bar',
};

export const MODE_ICONS: Readonly<Record<GuardMode, IconGlyph>> = {
  home: 'home',
  night: 'moon',
  away: 'door',
  armed: 'shield',
};
