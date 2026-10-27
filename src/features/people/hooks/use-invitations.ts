import type { IInvitationRecord } from '@/core/interfaces';
import { inviteService } from '@/core/services/invite';
import { synchronizeService } from '@/core/services/sync';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useNow } from '@/shared/hooks/use-now';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import type { Ask } from '@/features/people/hooks/use-ask';
import { useInvitationPreview } from '@/features/people/hooks/use-invitation-preview';
import { invitationLinesOf } from '@/features/people/model/invitations';
import type { InvitationLine } from '@/features/people/model/invitations';
import { INVITATION_LENSES, invitationStateOf } from '@/features/people/model/people-optimistic';

const MINUTE_MS = 60_000;

const refresh = () => void synchronizeService.syncOnce();

const nowSeconds = () => Math.floor(Date.now() / 1000);

const NO_INVITATIONS: readonly IInvitationRecord[] = [];

export function useInvitations(enabled: boolean, { ask }: Pick<Ask, 'ask'>) {
  const { t } = useTranslation();
  const now = useNow(MINUTE_MS);
  const cached = useViewCacheRows<IInvitationRecord>(VIEW_CACHE_KEYS.peopleInvitations);
  const { rows } = useOptimisticRows(enabled ? cached : NO_INVITATIONS, INVITATION_LENSES);
  const lines = invitationLinesOf(rows, now);
  const isSpent = (invitationId: number) => {
    const record = rows.find((invitation) => invitation.id === invitationId);
    return record != null && invitationStateOf(record, Date.now()) !== 'waiting';
  };
  const preview = useInvitationPreview({ onRevoked: refresh, isSpent });
  const revoke = (line: InvitationLine) =>
    ask({
      title: t('screens.users.revoke-title'),
      body: t('screens.users.revoke-description'),
      confirmLabel: t('screens.users.revoke'),
      destructive: true,
      run: () =>
        runOptimistic({
          intents: [
            {
              table: 'user_invitation',
              kind: 'update',
              recordId: String(line.id),
              values: { revokedAt: nowSeconds() },
            },
          ],
          call: () => inviteService.revoke(line.id),
        }).then((response) => {
          if (response) refresh();
        }),
    });
  const shown = preview.preview;
  return {
    lines,
    now,
    revoke,
    preview,
    previewRecord: shown ? (rows.find((row) => row.id === shown.invitationId) ?? null) : null,
  };
}

export type Invitations = ReturnType<typeof useInvitations>;
