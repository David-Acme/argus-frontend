import type { TranslateFn } from '@/core/types';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import { Avatar } from '@/shared/ui/avatar';
import type { AvatarTone } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import type { Invitations } from '@/features/people/hooks/use-invitations';
import { pendingCount } from '@/features/people/model/invitations';
import type { InvitationLine } from '@/features/people/model/invitations';
import type { InvitationState } from '@/features/people/model/people-optimistic';

export type InvitationsSectionProps = { invitations: Invitations; onInvite: () => void };

type InvitationRowProps = { line: InvitationLine; onRevoke: (line: InvitationLine) => void };

const STATE_TONE: Readonly<Record<InvitationState, AvatarTone>> = {
  waiting: 'accent',
  used: 'ok',
  closed: 'default',
  lapsed: 'default',
};

function pendingMeta(pending: number, t: TranslateFn): string | undefined {
  if (pending === 0) return undefined;
  return pending === 1
    ? t('screens.users.pending-one')
    : t('screens.users.pending', { count: String(pending) });
}

function useInvitationMeta(line: InvitationLine): string {
  const { t } = useTranslation();
  const view = useAccessView();
  const date = useDateFormatter();
  if (line.closing)
    return t('screens.users.invitation-reason.module', {
      module: view.moduleNames.get(line.closing.moduleId) ?? line.closing.moduleId,
    });
  switch (line.state) {
    case 'waiting':
      return t('screens.users.invitation-row.waiting', {
        time: date.formatTime(new Date(line.record.expiresAt * 1000)),
      });
    case 'used':
      return t('screens.users.invitation-row.used', {
        date: date.formatDayMonth(new Date(line.record.createdAt * 1000)),
      });
    case 'closed':
      return t('screens.users.invitation-row.closed');
    case 'lapsed':
      return t('screens.users.invitation-row.lapsed');
  }
}

function InvitationRow({ line, onRevoke }: InvitationRowProps) {
  const { t } = useTranslation();
  const meta = useInvitationMeta(line);
  const role = roleLabelOf(line.record.role, t);
  return (
    <Row
      leading={<Avatar icon="qr" tone={STATE_TONE[line.state]} />}
      title={t('screens.users.invitation-title', { role })}
      meta={meta}
      testID={`invitation-row-${line.id}`}
      trailing={
        line.revocable ? (
          <Button
            iconOnly
            compact
            icon="x"
            iconSize="small"
            label={t('screens.users.revoke-of', { role })}
            onPress={() => onRevoke(line)}
          />
        ) : undefined
      }
    />
  );
}

export function InvitationsSection({ invitations, onInvite }: InvitationsSectionProps) {
  const { t } = useTranslation();
  const { lines, revoke } = invitations;
  const pending = pendingCount(lines);
  return (
    <Section title={t('screens.users.invitations')} meta={pendingMeta(pending, t)}>
      {lines.map((line) => (
        <InvitationRow key={line.id} line={line} onRevoke={revoke} />
      ))}
      <Row
        leading={<Avatar icon="plus" tone="accent" />}
        title={t('screens.users.invite-someone')}
        meta={t('screens.users.invite-hint')}
        chevron
        onPress={onInvite}
      />
    </Section>
  );
}
