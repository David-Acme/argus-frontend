import type { GuardMode, TranslateFn } from '@/core/types';
import type { AuraTone } from '@/shared/theme';
import type { PresenceState } from '@/shared/ui/presence';
import type { StatusTone } from '@/shared/ui/status';

export type InicioPhase = 'loading' | 'calm' | 'night' | 'away' | 'alert' | 'offline';

export type InicioPhaseInput = {
  ready: boolean;
  offline: boolean;
  alert: boolean;
  mode: GuardMode | null;
};

export type HeroLook = { tone: StatusTone; presence: PresenceState; aura: AuraTone };

export type DayPart = 'morning' | 'afternoon' | 'evening';

export type HomePeople = { me: boolean; others: readonly string[] };

export type HomeLine =
  | { kind: 'me-and-others'; names: readonly string[] }
  | { kind: 'others'; names: readonly string[] }
  | { kind: 'me' }
  | { kind: 'nobody' };

export type Age = { unit: 'now' } | { unit: 'minutes' | 'hours' | 'days'; count: number };

export type MetaPart =
  | { kind: 'greeting' }
  | { kind: 'mode'; mode: GuardMode }
  | { kind: 'watching' }
  | { kind: 'people'; line: HomeLine }
  | { kind: 'age' }
  | { kind: 'headline' }
  | { kind: 'connect' };

export type HeroMetaInput = {
  phase: InicioPhase;
  band: boolean;
  mode: GuardMode | null;
  people: HomeLine | null;
  newHousehold: boolean;
};

const CALM: HeroLook = { tone: 'calm', presence: 'idle', aura: 'calm' };

const WATCH: HeroLook = { tone: 'calm', presence: 'watch', aura: 'duty' };

const LOOK: Record<InicioPhase, HeroLook> = {
  loading: CALM,
  calm: CALM,
  night: WATCH,
  away: WATCH,
  alert: { tone: 'alert', presence: 'alert', aura: 'alert' },
  offline: { tone: 'calm', presence: 'off', aura: 'off' },
};

const MINUTE = 60_000;

const HOUR = 60 * MINUTE;

const DAY = 24 * HOUR;

export function inicioPhase({ ready, offline, alert, mode }: InicioPhaseInput): InicioPhase {
  if (!ready) return 'loading';
  if (alert) return 'alert';
  if (offline) return 'offline';
  if (mode === 'night') return 'night';
  if (mode === 'away' || mode === 'armed') return 'away';
  return 'calm';
}

export function heroLook(phase: InicioPhase): HeroLook {
  return LOOK[phase];
}

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 20) return 'afternoon';
  return 'evening';
}

export function homeLine({ me, others }: HomePeople): HomeLine {
  if (me && others.length > 0) return { kind: 'me-and-others', names: others };
  if (others.length > 0) return { kind: 'others', names: others };
  return me ? { kind: 'me' } : { kind: 'nobody' };
}

export function ageOf(since: number, now: number): Age {
  const elapsed = Math.max(0, now - since);
  if (elapsed < MINUTE) return { unit: 'now' };
  if (elapsed < HOUR) return { unit: 'minutes', count: Math.floor(elapsed / MINUTE) };
  if (elapsed < DAY) return { unit: 'hours', count: Math.floor(elapsed / HOUR) };
  return { unit: 'days', count: Math.floor(elapsed / DAY) };
}

export function heroMeta({ phase, band, mode, people, newHousehold }: HeroMetaInput): MetaPart[] {
  if (phase === 'alert') return [{ kind: 'age' }, { kind: 'headline' }];
  const greeting: MetaPart[] = band ? [{ kind: 'greeting' }] : [];
  if (phase === 'night' && mode !== null)
    return [...greeting, { kind: 'mode', mode }, { kind: 'watching' }];
  const known: MetaPart[] = [
    ...(mode === null ? [] : [{ kind: 'mode', mode } as const]),
    ...(people === null ? [] : [{ kind: 'people', line: people } as const]),
  ];
  const connect: MetaPart[] = known.length === 0 && newHousehold ? [{ kind: 'connect' }] : [];
  return [...greeting, ...known, ...connect];
}

export function namesText(names: readonly string[], t: TranslateFn): string {
  if (names.length < 2) return names.join('');
  return t('screens.home.inicio.and', {
    first: names.slice(0, -1).join(', '),
    last: names.at(-1) ?? '',
  });
}
