import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { inviteService } from '@/core/services/invite';
import { synchronizeService } from '@/core/services/sync';
import type { IInvitationRecord, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { UserRole } from '@/core/types';
import { AppScreen } from '@/shared/components/layout';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { QrCode } from '@/shared/components/ui/qr-code';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { cn } from '@/shared/libs/utils';
import { InvitationDialog } from '@/features/people/components/invitation-dialog';
import { InvitationsPanel } from '@/features/people/components/invitations-panel';
import { ManagedUserDialog } from '@/features/people/components/managed-user-dialog';
import { MembersPanel } from '@/features/people/components/members-panel';
import { RoleAccessCard } from '@/features/people/components/role-access-card';
import { roleOptions } from '@/features/people/components/user-options';
import { useInvitationPreview } from '@/features/people/hooks/use-invitation-preview';
import { INVITATION_LENSES, USER_LENSES } from '@/features/people/model/people-optimistic';
import { userManagementService } from '@/features/people/services/user-management.service';

const MINUTE_MS = 60_000;

export default function UsersScreen() {
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const currentUserId = String(useAuthStore((state) => state.user?.id ?? ''));
  const [editing, setEditing] = useState<IPeopleDirectoryCacheRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const cachedUsers = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const cachedInvitations = useViewCacheRows<IInvitationRecord>(VIEW_CACHE_KEYS.peopleInvitations);
  const { rows: users } = useOptimisticRows(cachedUsers, USER_LENSES);
  const { rows: invitations } = useOptimisticRows(cachedInvitations, INVITATION_LENSES);
  const roleLabels = useMemo(() => roleOptions(t), [t]);
  const roleCounts = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {};
    for (const user of users) if (user.isActive) counts[user.role] = (counts[user.role] ?? 0) + 1;
    return counts;
  }, [users]);

  const refresh = useCallback(() => {
    void synchronizeService.syncOnce();
  }, []);
  const { preview, show: showPreview, dismiss: dismissPreview } = useInvitationPreview(refresh);

  const roleLabel = useCallback(
    (role: UserRole) => roleLabels.find((option) => option.value === role)?.label ?? role,
    [roleLabels],
  );

  const deactivate = useCallback(
    (user: IPeopleDirectoryCacheRow) => {
      void runOptimistic({
        confirm: {
          title: t('screens.users.deactivate-title', { name: user.name }),
          description: t('screens.users.deactivate-description'),
          confirmLabel: t('screens.users.deactivate'),
          intent: 'danger',
        },
        intents: [{ table: 'user', kind: 'update', recordId: user.id, values: { isActive: false } }],
        call: () => userManagementService.deactivate(Number(user.id)),
        success: t('screens.users.user-deactivated'),
      }).then((response) => {
        if (response) refresh();
      });
    },
    [refresh, t],
  );

  const revoke = useCallback(
    (invitation: IInvitationRecord) => {
      void runOptimistic({
        confirm: {
          title: t('screens.users.revoke-title'),
          description: t('screens.users.revoke-description'),
          confirmLabel: t('screens.users.revoke'),
          intent: 'danger',
        },
        intents: [
          {
            table: 'user_invitation',
            kind: 'update',
            recordId: String(invitation.id),
            values: { revokedAt: Math.floor(Date.now() / 1000) },
          },
        ],
        call: () => inviteService.revoke(invitation.id),
      }).then((response) => {
        if (response) refresh();
      });
    },
    [refresh, t],
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppScreen
      aside={
        <View className={cn(isWide && 'flex-1', 'gap-5')}>
          <View className="gap-3">
            <SectionHeader title={t('screens.users.role-access-title')} />
            <RoleAccessCard roleLabel={roleLabel} counts={roleCounts} />
          </View>
          <View className={cn(isWide && 'flex-1', 'gap-3')}>
            <SectionHeader
              title={t('screens.users.invitations')}
              count={invitations.length}
              action={t('screens.users.new-invitation')}
              onAction={() => setInviteOpen(true)}
            />
            <InvitationsPanel invitations={invitations} now={now} roleLabel={roleLabel} onRevoke={revoke} />
          </View>
        </View>
      }>
      <View className={cn(isWide && 'flex-1', 'gap-5')}>
        <View className="gap-1.5">
          <Text variant="display">{t('screens.users.title')}</Text>
          <Text variant="caption" className="text-foreground-secondary">
            {t('screens.users.subtitle')}
          </Text>
        </View>

        <View className={cn(isWide && 'flex-1', 'gap-3')}>
          <SectionHeader title={t('screens.users.members')} count={users.length} />
          <MembersPanel
            users={users}
            currentUserId={currentUserId}
            roleLabel={roleLabel}
            onEdit={setEditing}
            onDeactivate={deactivate}
            onInvite={() => setInviteOpen(true)}
          />
        </View>
      </View>

      {editing ? (
        <ManagedUserDialog
          key={editing.id}
          open
          user={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={refresh}
        />
      ) : null}
      <InvitationDialog open={inviteOpen} onOpenChange={setInviteOpen} onSaved={refresh} onCreated={showPreview} />
      <AdaptiveDialog
        open={preview !== null}
        onOpenChange={(open) => !open && dismissPreview()}
        title={t('screens.users.invitation-ready')}
        description={t('screens.users.invitation-ready-description')}
        closeLabel={t('common.close')}
        contentClassName="sm:max-w-[380px]"
        footer={
          <Button onPress={dismissPreview}>
            <Text>{t('common.close')}</Text>
          </Button>
        }>
        {preview ? (
          <View className="items-center pb-1">
            <QrCode value={preview.value} size={220} errorCorrection="M" />
          </View>
        ) : null}
      </AdaptiveDialog>
    </AppScreen>
  );
}
