import type { IApiError } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';

export const INVITATION_MODULE_DISABLED = 'INVITATION_MODULE_DISABLED';

export type InvitationRevoked = {
  moduleId: string | null;
};

export function invitationRevokedBy(error: IApiError | null | undefined): InvitationRevoked | null {
  if (error?.code !== INVITATION_MODULE_DISABLED) return null;
  const moduleId = error.list?.find((entry) => entry.code === 'MODULE_ID')?.message.trim();
  return { moduleId: moduleId ? moduleId : null };
}

const KNOWN_MODULES: Readonly<Record<string, 'surveillance' | 'productivity' | 'agronomy'>> = {
  surveillance: 'surveillance',
  productivity: 'productivity',
  agronomy: 'agronomy',
};

export function invitationRevokedText(revoked: InvitationRevoked, t: TranslateFn): string {
  const known = revoked.moduleId ? KNOWN_MODULES[revoked.moduleId] : undefined;
  const module = known ? t(`screens.invitation.modules.${known}`) : t('screens.invitation.modules.other');
  return t('screens.invitation.revoked-module', { module });
}
