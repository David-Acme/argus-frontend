import type { IInvitationRecord } from '@/core/interfaces';
import type { InviteRole } from '@/core/types';
import { INVITE_ROLES } from '@/features/people/constants/people.constant';
import { invitationClosingOf, invitationStateOf } from '@/features/people/model/people-optimistic';
import type { InvitationClosing, InvitationState } from '@/features/people/model/people-optimistic';

export type InvitationPreview = {
  invitationId: number;
  role: InviteRole;
  expiresAt: number;
  value: string;
};

export function offerableRoles(moduleOff: (role: InviteRole) => boolean): InviteRole[] {
  return INVITE_ROLES.filter((role) => !moduleOff(role));
}

export function previewLifecycle(
  preview: Pick<InvitationPreview, 'expiresAt'>,
  record: IInvitationRecord | null
): Pick<IInvitationRecord, 'revokedAt' | 'expiresAt' | 'redemptionCount' | 'maxRedemptions'> {
  return (
    record ?? {
      revokedAt: null,
      expiresAt: preview.expiresAt,
      redemptionCount: 0,
      maxRedemptions: 1,
    }
  );
}

export type InvitationLine = {
  id: number;
  record: IInvitationRecord;
  state: InvitationState;
  closing: InvitationClosing | null;
  revocable: boolean;
};

const STATE_RANK: Readonly<Record<InvitationState, number>> = {
  waiting: 0,
  used: 1,
  lapsed: 2,
  closed: 3,
};

export function invitationLinesOf(
  invitations: readonly IInvitationRecord[],
  nowMs: number
): InvitationLine[] {
  return invitations
    .map((record): InvitationLine => {
      const state = invitationStateOf(record, nowMs);
      return {
        id: record.id,
        record,
        state,
        closing: state === 'closed' ? invitationClosingOf(record) : null,
        revocable: state === 'waiting',
      };
    })
    .sort(
      (left, right) =>
        STATE_RANK[left.state] - STATE_RANK[right.state] ||
        right.record.createdAt - left.record.createdAt
    );
}

export function pendingCount(lines: readonly Pick<InvitationLine, 'state'>[]): number {
  return lines.filter((line) => line.state === 'waiting').length;
}

export type InvitationGroups = {
  current: InvitationLine[];
  earlier: InvitationLine[];
};

const EARLIER: ReadonlySet<InvitationState> = new Set(['closed', 'lapsed']);

export function invitationGroupsOf(lines: readonly InvitationLine[]): InvitationGroups {
  return {
    current: lines.filter((line) => !EARLIER.has(line.state)),
    earlier: lines.filter((line) => EARLIER.has(line.state)),
  };
}
