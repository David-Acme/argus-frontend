import type { CalendarEntry, GuardEnvironment, TranslateFn } from '@/core/types';

export type CallSituationEvent = {
  camera: string;
  what: string;
  at: number;
};

export type CallSituationInput = {
  t: TranslateFn;
  guard: readonly GuardEnvironment[];
  agenda: readonly CalendarEntry[];
  agendaItems: number;
  events: readonly CallSituationEvent[];
  offlineCameras: readonly string[];
};

const pad = (value: number): string => String(value).padStart(2, '0');

export function clockOf(epochMs: number): string {
  const date = new Date(epochMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function spokenDetail(text: string): string {
  const trimmed = text.trim().replace(/[.\s]+$/u, '');
  if (!trimmed) return '';
  return trimmed.charAt(0).toLocaleLowerCase() + trimmed.slice(1);
}

function agendaLine({ t, agenda, agendaItems }: CallSituationInput): string {
  const pending = agenda
    .filter((entry) => entry.status !== 'complete')
    .slice()
    .sort((a, b) => Number(b.isAllDay) - Number(a.isAllDay) || a.startsAt - b.startsAt);
  if (pending.length === 0) return t('screens.voice.situation.agenda-empty');
  const shown = pending.slice(0, agendaItems).map((entry) =>
    entry.isAllDay
      ? t('screens.voice.situation.all-day', { title: entry.title })
      : `${clockOf(entry.startsAt)} ${entry.title}`,
  );
  const more = pending.length - shown.length;
  const items = shown.join('; ');
  return more > 0
    ? t('screens.voice.situation.agenda-more', { items, count: String(more) })
    : t('screens.voice.situation.agenda', { items });
}

function guardPlace(t: TranslateFn, environment: GuardEnvironment): string {
  const name = environment.name;
  switch (environment.occupancy) {
    case 'open':
      return t('screens.voice.situation.guard-place-open', { name });
    case 'staffed':
      return t('screens.voice.situation.guard-place-staffed', { name });
    case 'asleep':
      return t('screens.voice.situation.guard-place-asleep', { name });
    case 'closed':
      return t('screens.voice.situation.guard-place-closed', {
        name,
        mode: t(`screens.voice.situation.modes.${environment.effectiveMode}`),
      });
    default:
      return t('screens.voice.situation.guard-place', {
        name,
        mode: t(`screens.voice.situation.modes.${environment.mode}`),
      });
  }
}

function guardLine(t: TranslateFn, guard: readonly GuardEnvironment[]): string | null {
  const [only] = guard;
  if (!only) return null;
  if (guard.length === 1) {
    return t('screens.voice.situation.guard-mode', { mode: t(`screens.voice.situation.modes.${only.mode}`) });
  }
  return t('screens.voice.situation.guard-places', {
    items: guard.map((environment) => guardPlace(t, environment)).join('; '),
  });
}

export function buildCallSituation(input: CallSituationInput): string {
  const { t, guard, events, offlineCameras } = input;
  const lines = [t('screens.voice.situation.header')];
  const guardText = guardLine(t, guard);
  if (guardText) lines.push(guardText);
  lines.push(agendaLine(input));
  if (events.length > 0) {
    const items = events.map((event) => `${clockOf(event.at)} ${event.camera}: ${event.what}`).join('; ');
    lines.push(t('screens.voice.situation.events', { items }));
  }
  if (offlineCameras.length > 0) {
    lines.push(t('screens.voice.situation.offline', { names: offlineCameras.join(', ') }));
  }
  return lines.join('\n');
}
