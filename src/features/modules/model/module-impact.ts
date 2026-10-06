import { roleLabelOf } from '@/shared/libs/role-label';
import type {
  LanguageCode,
  ModuleImpact,
  ModuleImpactInvitation,
  ModuleImpactStop,
  ModuleRoleHolder,
  ModuleRoleMove,
  TranslateFn,
  TranslationKey,
} from '@/core/types';

const STOP_KEYS: Readonly<Record<string, TranslationKey>> = {
  live_views: 'screens.modules.impact.stops.live_views',
  camera_talk: 'screens.modules.impact.stops.camera_talk',
  camera_detection: 'screens.modules.impact.stops.camera_detection',
  guard_evaluation: 'screens.modules.impact.stops.guard_evaluation',
  guard_digests: 'screens.modules.impact.stops.guard_digests',
  guard_duty: 'screens.modules.impact.stops.guard_duty',
  pending_alerts: 'screens.modules.impact.stops.pending_alerts',
  visitor_recognition: 'screens.modules.impact.stops.visitor_recognition',
  agenda_calls: 'screens.modules.impact.stops.agenda_calls',
};

const codeOf = (kind: string) => kind.trim().toLowerCase().replace(/[\s-]+/g, '_');

export function stopText(stop: ModuleImpactStop, moduleName: string, t: TranslateFn): string {
  const key = STOP_KEYS[codeOf(stop.kind)];
  const text = key ? t(key) : t('screens.modules.impact.stops.other', { module: moduleName });
  return stop.count !== null && stop.count > 0 ? `${text} (${stop.count})` : text;
}

export const holderName = (holder: Pick<ModuleRoleHolder, 'name' | 'lastName' | 'userId'>): string =>
  [holder.name, holder.lastName].filter(Boolean).join(' ') || `#${holder.userId}`;

export function roleMoveText(move: ModuleRoleMove, t: TranslateFn): string {
  const who = move.name || `#${move.userId}`;
  const to = roleLabelOf(move.to, t);
  return move.from ? `${who} · ${roleLabelOf(move.from, t)} → ${to}` : `${who} · ${to}`;
}

export type ReassignChoices = Readonly<Record<string, string>>;

export const needsReassign = (impact: ModuleImpact): boolean =>
  impact.roleEffect === 'reassign_required' && impact.roleHolders.length > 0;

export function reassignComplete(impact: ModuleImpact, choices: ReassignChoices): boolean {
  if (!needsReassign(impact)) return true;
  return impact.roleHolders.every((holder) => {
    const chosen = choices[String(holder.userId)];
    return chosen !== undefined && impact.reassignRoles.includes(chosen);
  });
}

export function reassignBody(impact: ModuleImpact, choices: ReassignChoices): Record<string, string> | undefined {
  if (!needsReassign(impact)) return undefined;
  return Object.fromEntries(impact.roleHolders.map((holder) => [String(holder.userId), choices[String(holder.userId)] ?? '']));
}

export type InvitationsOfImpact = {
  count: number;
  roles: string[];
  inviters: string[];
};

export function invitationsOf(invitations: readonly ModuleImpactInvitation[]): InvitationsOfImpact {
  return {
    count: invitations.length,
    roles: [...new Set(invitations.map((invitation) => invitation.role))],
    inviters: [...new Set(invitations.map((invitation) => invitation.createdByName).filter(Boolean))],
  };
}

export type KeepsRunningLine = {
  id: string;
  text: string;
};

export function keepsRunningOf(impact: ModuleImpact, language: LanguageCode): KeepsRunningLine[] {
  return impact.keepsRunning.flatMap((item) => {
    const text = item.text[language] || item.text.es || item.text.en;
    return text ? [{ id: item.id, text }] : [];
  });
}

export const impactIsPartial = (impact: ModuleImpact): boolean => impact.unreachable.length > 0;

export const impactHasEffects = (impact: ModuleImpact): boolean =>
  impact.stops.length > 0 ||
  impact.keepsRunning.length > 0 ||
  impact.roleMoves.length > 0 ||
  impact.roleHolders.length > 0 ||
  impact.invitations.length > 0;

export function refusalOf(impact: ModuleImpact): string | null {
  return impact.allowed ? null : (impact.refusal?.code ?? 'REFUSED');
}
