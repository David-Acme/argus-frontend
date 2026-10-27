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
  inviter: string | null;
};

export type InvitationAnswer = {
  ok: boolean;
  status: number;
  role: InviteRole | null;
  inviter: string | null;
  errors: IApiError | null;
};

export function invitationOutcomeOf({
  ok,
  status,
  role,
  inviter,
  errors,
}: InvitationAnswer): InvitationOutcome {
  if (ok && role) return { phase: 'valid', role, revoked: null, inviter };
  const revoked = invitationRevokedBy(errors);
  if (revoked) return { phase: 'expired', role: null, revoked, inviter: null };
  if (errors?.code === 'FINGERPRINT_MISMATCH')
    return { phase: 'mismatch', role: null, revoked: null, inviter: null };
  return {
    phase: status === 0 ? 'unreachable' : 'expired',
    role: null,
    revoked: null,
    inviter: null,
  };
}

export type InvitationCopy = {
  title: TranslationKey;
  lead: TranslationKey;
  action: 'accept' | 'understood' | 'scan';
  name?: string;
};

export function invitationCopyOf({ phase, role, inviter }: InvitationOutcome): InvitationCopy {
  if (phase === 'valid' && role)
    return {
      title: inviter ? 'screens.invitation.valid-title-by' : 'screens.invitation.valid-title',
      lead: `screens.invitation.role.${role}`,
      action: 'accept',
      ...(inviter ? { name: inviter } : {}),
    };
  if (phase === 'expired')
    return {
      title: 'screens.invitation.expired-title',
      lead: 'screens.invitation.expired-lead',
      action: 'understood',
    };
  return { title: 'screens.invitation.title', lead: 'screens.invitation.lead', action: 'scan' };
}
