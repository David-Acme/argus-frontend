import type {
  DeviceLoginDetails,
  SessionOrigin,
  SessionPlatform,
  TranslationKey,
} from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export type ApprovePhase =
  | 'idle'
  | 'checking'
  | 'confirm'
  | 'approving'
  | 'approved'
  | 'denying'
  | 'denied'
  | 'deny-failed'
  | 'expired'
  | 'error';

export type ApproveDecision = 'approve' | 'deny';

export type DecisionAnswer = { ok: boolean; status: number };

type DeviceKind = 'desktop' | 'phone' | 'other';

const KIND: Readonly<Record<SessionPlatform, DeviceKind>> = {
  desktop: 'desktop',
  android: 'phone',
  ios: 'phone',
  web: 'other',
  unknown: 'other',
};

const GLYPH: Readonly<Record<DeviceKind, IconGlyph>> = {
  desktop: 'laptop',
  phone: 'phone',
  other: 'devices',
};

const ORIGIN: Readonly<Record<SessionOrigin, TranslationKey>> = {
  lan: 'screens.approve.origin.lan',
  loopback: 'screens.approve.origin.loopback',
  tunnel: 'screens.approve.origin.tunnel',
  external: 'screens.approve.origin.external',
  unknown: 'screens.approve.origin.unknown',
};

const FALLBACK_NAME: Readonly<Record<SessionPlatform, TranslationKey>> = {
  android: 'screens.sessions.fallback-name.android',
  ios: 'screens.sessions.fallback-name.ios',
  desktop: 'screens.sessions.fallback-name.desktop',
  web: 'screens.sessions.fallback-name.web',
  unknown: 'screens.sessions.fallback-name.unknown',
};

const HOME: ReadonlySet<SessionOrigin> = new Set(['lan', 'loopback']);

const GONE: ReadonlySet<number> = new Set([404, 409, 410]);

export const approveTitleOf = (platform: SessionPlatform): TranslationKey =>
  `screens.approve.confirm-title.${KIND[platform]}`;

export const deviceGlyphOf = (platform: SessionPlatform): IconGlyph => GLYPH[KIND[platform]];

export const originKeyOf = (origin: SessionOrigin): TranslationKey => ORIGIN[origin];

export const fallbackNameOf = (platform: SessionPlatform): TranslationKey =>
  FALLBACK_NAME[platform];

export const fromHome = (details: DeviceLoginDetails): boolean => HOME.has(details.origin);

export const refusedPhase = (status: number): ApprovePhase =>
  GONE.has(status) ? 'expired' : 'error';

const CONFIRMING: ReadonlySet<ApprovePhase> = new Set([
  'confirm',
  'approving',
  'denying',
  'deny-failed',
]);

const DECIDING: Readonly<Record<ApproveDecision, ApprovePhase>> = {
  approve: 'approving',
  deny: 'denying',
};

const DECIDED: Readonly<Record<ApproveDecision, ApprovePhase>> = {
  approve: 'approved',
  deny: 'denied',
};

export const decidingPhase = (decision: ApproveDecision): ApprovePhase => DECIDING[decision];

export function decidedPhase(
  decision: ApproveDecision,
  { ok, status }: DecisionAnswer
): ApprovePhase {
  if (ok) return DECIDED[decision];
  const refused = refusedPhase(status);
  return decision === 'deny' && refused === 'error' ? 'deny-failed' : refused;
}

export const isConfirming = (phase: ApprovePhase): boolean => CONFIRMING.has(phase);

export function approveNoteOf(
  phase: ApprovePhase
): { tone: 'ok' | 'alert'; key: TranslationKey } | null {
  if (phase === 'approved') return { tone: 'ok', key: 'screens.approve.approved' };
  if (phase === 'denied') return { tone: 'ok', key: 'screens.approve.denied' };
  if (phase === 'deny-failed') return { tone: 'alert', key: 'screens.approve.deny-error' };
  if (phase === 'expired') return { tone: 'alert', key: 'screens.approve.expired' };
  if (phase === 'error') return { tone: 'alert', key: 'screens.approve.error' };
  return null;
}
