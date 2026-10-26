import type { GuardDanger, GuardTimelineEntry, TranslateFn, TranslationKey } from '@/core/types';

const SENT: ReadonlySet<string> = new Set([
  'succeeded',
  'duplicate_succeeded',
  'in_flight',
  'pending',
  'indeterminate',
]);

const DANGER = {
  none: 'screens.security.danger.none',
  low: 'screens.security.danger.low',
  medium: 'screens.security.danger.medium',
  high: 'screens.security.danger.high',
  critical: 'screens.security.danger.critical',
} as const satisfies Record<GuardDanger, TranslationKey>;

const SUPPRESSION = {
  thread_suppressed: 'screens.security.episodes.timeline.decision-repeat',
  grouped: 'screens.security.episodes.timeline.decision-grouped',
  held: 'screens.security.episodes.timeline.decision-held',
  staging: 'screens.security.episodes.timeline.decision-staging',
  budget: 'screens.security.episodes.timeline.decision-budget',
  belief_gate: 'screens.security.episodes.timeline.decision-belief',
} as const;

type Suppression = keyof typeof SUPPRESSION;

const ACTIONS = {
  notify: {
    sent: 'screens.security.episodes.timeline.action-notify',
    failed: 'screens.security.episodes.timeline.failed-notify',
  },
  announce: {
    sent: 'screens.security.episodes.timeline.action-announce',
    failed: 'screens.security.episodes.timeline.failed-announce',
  },
  greet: {
    sent: 'screens.security.episodes.timeline.action-greet',
    failed: 'screens.security.episodes.timeline.failed-greet',
  },
  greet_listen: {
    sent: 'screens.security.episodes.timeline.action-greet-listen',
    failed: 'screens.security.episodes.timeline.failed-greet-listen',
  },
  greet_reply: {
    sent: 'screens.security.episodes.timeline.action-greet-reply',
    failed: 'screens.security.episodes.timeline.failed-greet-reply',
  },
  alarm: {
    sent: 'screens.security.episodes.timeline.action-alarm',
    failed: 'screens.security.episodes.timeline.failed-alarm',
  },
  siren_arm: {
    sent: 'screens.security.episodes.timeline.action-siren-arm',
    failed: 'screens.security.episodes.timeline.failed-siren-arm',
  },
  siren_disarm: {
    sent: 'screens.security.episodes.timeline.action-siren-disarm',
    failed: 'screens.security.episodes.timeline.failed-siren-disarm',
  },
} as const;

type Action = keyof typeof ACTIONS;

const STATES = {
  escalating: 'screens.security.episodes.timeline.escalating',
  observing: 'screens.security.episodes.timeline.observing',
} as const;

type State = keyof typeof STATES;

function known<T extends string>(table: Record<T, unknown>, value: string): value is T {
  return Object.hasOwn(table, value);
}

function stateText(entry: Extract<GuardTimelineEntry, { type: 'state' }>, t: TranslateFn): string {
  if (entry.state === 'closed')
    return t(
      entry.reason === 'known_resident'
        ? 'screens.security.episodes.timeline.known-resident'
        : 'screens.security.episodes.timeline.stale'
    );
  return known<State>(STATES, entry.state)
    ? t(STATES[entry.state])
    : t('screens.security.episodes.timeline.verifying');
}

function decisionText(
  entry: Extract<GuardTimelineEntry, { type: 'decision' }>,
  t: TranslateFn
): string {
  const danger = t(DANGER[entry.danger]).toLowerCase();
  const suppression = entry.suppression;
  const base = entry.notified
    ? t('screens.security.episodes.timeline.decision-alerted', { danger })
    : known<Suppression>(SUPPRESSION, suppression)
      ? t(SUPPRESSION[suppression])
      : t('screens.security.episodes.timeline.decision-silent', { danger });
  if (entry.count <= 1) return base;
  return `${base} ${t('screens.security.episodes.timeline.times', { count: String(entry.count) })}`;
}

export function timelineText(entry: GuardTimelineEntry, t: TranslateFn): string {
  if (entry.type === 'state') return stateText(entry, t);
  if (entry.type === 'decision') return decisionText(entry, t);
  const words = known<Action>(ACTIONS, entry.action) ? ACTIONS[entry.action] : ACTIONS.siren_disarm;
  return t(SENT.has(entry.status) ? words.sent : words.failed);
}

export function timelineRaised(entry: GuardTimelineEntry): boolean {
  return entry.type === 'decision' && entry.notified;
}
