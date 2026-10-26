import { useState } from 'react';
import type { IAuthUser } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { GuardMode, IncidentResponse, TranslateFn } from '@/core/types';
import { OFFLINE_NOTICE_DELAY_MS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { alertSentence, headlineOf, headlineWords, useOpenResponse } from '@/features/response';
import { useGuardHeadline } from '@/features/security';
import { useHomePeople } from '@/features/home/hooks/use-home-people';
import { presenceKnown } from '@/features/home/model/home-people';
import {
  ageOf,
  dayPart,
  heroLook,
  heroMeta,
  homeLine,
  inicioPhase,
  namesText,
  type Age,
  type HeroLook,
  type HomeLine,
  type InicioPhase,
  type MetaPart,
} from '@/features/home/model/inicio-hero';

export type InicioHero = HeroLook & {
  phase: InicioPhase;
  greeting: string;
  sentence: string;
  meta: string;
  alert: IncidentResponse | null;
  offlineAge: string | null;
};

type OfflineSeen = { offline: boolean; since: number | null };

type MetaWords = {
  t: TranslateFn;
  greeting: string;
  age: string;
  headline: string;
};

const MINUTE_MS = 60_000;

const SENTENCE_KEYS = {
  loading: 'screens.home.inicio.sentence.calm',
  alert: 'screens.home.inicio.sentence.calm',
  calm: 'screens.home.inicio.sentence.calm',
  night: 'screens.home.inicio.sentence.night',
  away: 'screens.home.inicio.sentence.away',
  offline: 'screens.home.inicio.sentence.offline',
} as const;

function firstNameOf(user: IAuthUser | null): string {
  return user?.name?.trim().split(/\s+/)[0] ?? '';
}

const PEOPLE_KEYS = {
  'me-and-others': 'screens.home.inicio.people.me-and-others',
  others: 'screens.home.inicio.people.others',
} as const;

const ALONE_KEYS = {
  me: 'screens.home.inicio.people.me',
  nobody: 'screens.home.inicio.people.nobody',
} as const;

const MODE_KEYS = {
  home: 'screens.security.mode.home',
  night: 'screens.security.mode.night',
  away: 'screens.security.mode.away',
  armed: 'screens.security.mode.armed',
} as const;

const AGE_KEYS = {
  age: {
    now: 'screens.home.inicio.age.now',
    minutes: 'screens.home.inicio.age.minutes',
    hours: 'screens.home.inicio.age.hours',
    days: 'screens.home.inicio.age.days',
  },
  since: {
    now: 'screens.home.inicio.since.now',
    minutes: 'screens.home.inicio.since.minutes',
    hours: 'screens.home.inicio.since.hours',
    days: 'screens.home.inicio.since.days',
  },
} as const;

const GREETING_KEYS = {
  morning: 'screens.home.inicio.greeting.morning',
  afternoon: 'screens.home.inicio.greeting.afternoon',
  evening: 'screens.home.inicio.greeting.evening',
} as const;

const ANONYMOUS_KEYS = {
  morning: 'screens.home.inicio.greeting-anonymous.morning',
  afternoon: 'screens.home.inicio.greeting-anonymous.afternoon',
  evening: 'screens.home.inicio.greeting-anonymous.evening',
} as const;

function peopleText(line: HomeLine, t: TranslateFn): string {
  if (line.kind === 'me' || line.kind === 'nobody') return t(ALONE_KEYS[line.kind]);
  return t(PEOPLE_KEYS[line.kind], { names: namesText(line.names, t) });
}

function modeText(mode: GuardMode, named: boolean, t: TranslateFn): string {
  const label = t(MODE_KEYS[mode]);
  return named ? t('screens.home.inicio.mode', { mode: label }) : label;
}

function ageText(age: Age, key: 'age' | 'since', t: TranslateFn): string {
  if (age.unit === 'now') return t(AGE_KEYS[key].now);
  return t(AGE_KEYS[key][age.unit], { count: String(age.count) });
}

function partText(part: MetaPart, words: MetaWords): string {
  switch (part.kind) {
    case 'greeting':
      return words.greeting;
    case 'mode':
      return modeText(part.mode, part.named, words.t);
    case 'watching':
      return words.t('screens.home.inicio.watching');
    case 'people':
      return peopleText(part.line, words.t);
    case 'age':
      return words.age;
    case 'headline':
      return words.headline;
  }
}

function sentenceOf(phase: InicioPhase, alert: IncidentResponse | null, t: TranslateFn): string {
  return phase === 'alert' && alert ? alertSentence(alert, t) : t(SENTENCE_KEYS[phase]);
}

function useOfflineSince(offline: boolean, now: number): number | null {
  const [seen, setSeen] = useState<OfflineSeen>({ offline: false, since: null });
  if (seen.offline !== offline)
    setSeen({ offline, since: offline ? now - OFFLINE_NOTICE_DELAY_MS : null });
  return seen.since;
}

function useInicioGreeting(now: number): string {
  const { t } = useTranslation();
  const name = firstNameOf(useAuthStore((state) => state.user));
  const part = dayPart(new Date(now).getHours());
  return name ? t(GREETING_KEYS[part], { name }) : t(ANONYMOUS_KEYS[part]);
}

function useHomeLine(): HomeLine | null {
  const { readable, people } = useHomePeople();
  if (!readable || !presenceKnown(people)) return null;
  const home = people.filter((person) => person.state === 'home');
  return homeLine({
    me: home.some((person) => person.self),
    others: home.filter((person) => !person.self).map((person) => person.name),
  });
}

export function useInicioHero(band: boolean): InicioHero {
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const { ready } = useCapabilities();
  const synced = useViewCacheValue<boolean>(VIEW_CACHE_KEYS.syncReady) === true;
  const offline = useOfflineNotice();
  const since = useOfflineSince(offline, now);
  const alert = useOpenResponse();
  const selfId = useAuthStore((state) => state.user?.id ?? 0);
  const mode = useGuardHeadline();
  const people = useHomeLine();
  const greeting = useInicioGreeting(now);
  const phase = inicioPhase({ ready: ready && synced, offline, alert: alert !== null, mode });
  const words: MetaWords = {
    t,
    greeting,
    age: alert ? ageText(ageOf(alert.createdAt * 1000, now), 'since', t) : '',
    headline: alert ? headlineWords(headlineOf(alert, selfId), t) : '',
  };
  return {
    ...heroLook(phase),
    phase,
    greeting,
    sentence: sentenceOf(phase, alert, t),
    meta: heroMeta({ phase, band, mode, people })
      .map((part) => partText(part, words))
      .join(' · '),
    alert,
    offlineAge: since === null ? null : ageText(ageOf(since, now), 'age', t),
  };
}
