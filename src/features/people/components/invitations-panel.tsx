import type { IInvitationRecord } from '@/core/interfaces';
import type { UserRole } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { isInvitationUsable } from '@/features/people/model/people-optimistic';

type InvitationsPanelProps = {
  invitations: readonly IInvitationRecord[];
  now: number;
  roleLabel: (role: UserRole) => string;
  onRevoke: (invitation: IInvitationRecord) => void;
};

export function InvitationsPanel({ invitations, now, roleLabel, onRevoke }: InvitationsPanelProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();

  return (
    <Panel className="min-h-40 flex-1 gap-1 p-1.5">
      {invitations.length === 0 ? (
        <EmptyState
          variant="panel"
          icon="qr-code"
          title={t('screens.users.no-invitations')}
          hint={t('screens.users.invitations-hint')}
        />
      ) : null}
      {invitations.map((invitation) => {
        const usable = isInvitationUsable(invitation, now);
        return (
          <ListRow
            key={invitation.id}
            icon="qr-code"
            title={roleLabel(invitation.role)}
            subtitle={t('screens.users.invitation-summary', {
              used: String(invitation.redemptionCount),
              total: String(invitation.maxRedemptions),
              date: date.formatDayMonth(new Date(invitation.expiresAt * 1000)),
            })}
            trailing={
              <>
                <Text variant="caption" className={usable ? 'text-success' : undefined}>
                  {usable ? t('screens.users.active') : t('screens.users.inactive')}
                </Text>
                {usable ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    accessibilityLabel={t('screens.users.revoke')}
                    onPress={() => onRevoke(invitation)}>
                    <Icon name="x" className="text-error-strong size-5" />
                  </Button>
                ) : null}
              </>
            }
          />
        );
      })}
    </Panel>
  );
}
