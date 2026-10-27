import type { IApiError } from '@/core/interfaces';
import type { InviteRole, TranslationKey } from '@/core/types';
import { invitationRevokedBy } from '@/features/auth/model/invitation-refusal';
import type { InvitationRevoked } from '@/features/auth/model/invitation-refusal';

export type InvitationPhase =
  'idle' | 'resolving' | 'valid' | 'expired' | 'mismatch' | 'unreachable';

export type InvitationOutcome = {
  phase: InvitationPhase;
  role: InviteRole | null;
  revoked: InvitationRevoked | null;
};

export type InvitationAnswer = {
  ok: boolean;
  status: number;
  role: InviteRole | null;
  errors: IApiError | null;
};

export function invitationOutcomeOf({
  ok,
  status,
  role,
  errors,
}: InvitationAnswer): InvitationOutcome {
  if (ok && role) return { phase: 'valid', role, revoked: null };
  const revoked = invitationRevokedBy(errors);
  if (revoked) return { phase: 'expired', role: null, revoked };
  if (errors?.code === 'FINGERPRINT_MISMATCH')
    return { phase: 'mismatch', role: null, revoked: null };
  return { phase: status === 0 ? 'unreachable' : 'expired', role: null, revoked: null };
}

export type InvitationCopy = {
  title: TranslationKey;
  lead: TranslationKey;
  action: 'accept' | 'understood' | 'scan';
};

export function invitationCopyOf({ phase, role }: InvitationOutcome): InvitationCopy {
  if (phase === 'valid' && role)
    return {
      title: 'screens.invitation.valid-title',
      lead: `screens.invitation.role.${role}`,
      action: 'accept',
    };
  if (phase === 'expired')
    return {
      title: 'screens.invitation.expired-title',
      lead: 'screens.invitation.expired-lead',
      action: 'understood',
    };
  return { title: 'screens.invitation.title', lead: 'screens.invitation.lead', action: 'scan' };
}
