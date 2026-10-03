import { inviteService } from '@/core/services/invite';

import { synchronizeService } from '@/core/services/sync';
import { userManagementService } from '@/core/services/user-management.service';
import type {
  IInvitationRecord,
  IPeopleDirectoryCacheRow,
  IUserManagementRecord,
} from '@/core/interfaces';
import type { UserRole } from '@/core/types';
import {
} from '@/shared/components/dashboard';
import { AppScreen } from '@/shared/components/layout';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';

import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';

import { QrCode } from '@/shared/components/ui/qr-code';

import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { toastServiceError } from '@/shared/libs/service-error';
import {
  InvitationDialog,
  ManagedUserDialog,
  RoleAccessCard,
  roleOptions,
  type InvitationPreview,
} from '@/shared/components/users';
import { runServiceAction } from '@/shared/libs/service-action';

export default function UsersScreen() {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [editing, setEditing] = useState<IUserManagementRecord | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [qrPreview, setQrPreview] = useState<InvitationPreview | null>(null);
  const qrPreviewRef = useRef<InvitationPreview | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const people = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const users = useMemo<IUserManagementRecord[]>(
    () =>
      people.map((user) => ({
        id: Number(user.id),
        name: user.name,
        lastName: user.lastName,
        role: user.role,
        lang: 'es',
        isActive: user.isActive,
        createdAt: Math.floor(user.createdAt / 1000),
        updatedAt: Math.floor(user.updatedAt / 1000),
        deletedAt: null,
      })),
    [people],
  );
  const invitations = useViewCacheRows<IInvitationRecord>(VIEW_CACHE_KEYS.peopleInvitations);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    qrPreviewRef.current = qrPreview;
  }, [qrPreview]);

  useEffect(
    () => () => {
      const preview = qrPreviewRef.current;
      if (preview) void inviteService.revoke(preview.invitationId);
    },
    [],
  );

  const refresh = useCallback(async () => {
    await synchronizeService.syncOnce();
  }, []);

  const deactivate = useCallback(
    async (user: IUserManagementRecord) => {
      const response = await runServiceAction({
        confirm: {
          title: t('screens.users.deactivate-title', { name: user.name }),
          description: t('screens.users.deactivate-description'),
          confirmLabel: t('screens.users.deactivate'),
          intent: 'danger',
        },
        call: () => userManagementService.deactivate(user.id),
        success: t('screens.users.user-deactivated'),
      });
      if (response) await refresh();
    },
    [refresh, t],
  );

  const revoke = useCallback(
    async (invitation: IInvitationRecord) => {
      const response = await runServiceAction({
        confirm: {
          title: t('screens.users.revoke-title'),
          description: t('screens.users.revoke-description'),
          confirmLabel: t('screens.users.revoke'),
          intent: 'danger',
        },
        call: () => inviteService.revoke(invitation.id),
      });
      if (response) await refresh();
    },
    [refresh, t],
  );

  const dismissPreview = useCallback(() => {
    const preview = qrPreview;
    qrPreviewRef.current = null;
    setQrPreview(null);
    if (!preview) return;
    void inviteService.revoke(preview.invitationId).then((response) => {
      if (!response.ok) toastServiceError(response.errors);
      else void refresh();
    });
  }, [qrPreview, refresh]);

  const userRoleLabels = useMemo(() => roleOptions(t), [t]);
  const roleCounts = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {};
    for (const user of users) if (user.isActive) counts[user.role] = (counts[user.role] ?? 0) + 1;
    return counts;
  }, [users]);
  const roleLabel = useCallback(
    (role: UserRole) => userRoleLabels.find((option) => option.value === role)?.label ?? role,
    [userRoleLabels],
  );


  return (
    <AppScreen
      aside={
        <View className="gap-5">
          <View className="gap-3">
            <SectionHeader
              title={t('screens.users.invitations')}
              action={t('screens.users.new-invitation')}
              onAction={() => setInviteOpen(true)}
            />
            <Panel className="gap-1 p-1.5">
              {invitations.length === 0 ? (
                <EmptyState variant="inline" icon="qr-code" title={t('screens.users.no-invitations')} />
              ) : null}
              {invitations.map((invitation) => {
                const usable =
                  invitation.revokedAt == null &&
                  invitation.expiresAt * 1000 > now &&
                  invitation.redemptionCount < invitation.maxRedemptions;
                return (
                  <ListRow
                    key={invitation.id}
                    icon="qr-code"
                    title={roleLabel(invitation.role)}
                    subtitle={`${invitation.redemptionCount}/${invitation.maxRedemptions} · ${date.formatDayMonth(new Date(invitation.expiresAt * 1000))}`}
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
                            onPress={() => void revoke(invitation)}>
                            <Icon name="x" className="text-error-strong size-5" />
                          </Button>
                        ) : null}
                      </>
                    }
                  />
                );
              })}
            </Panel>
          </View>
          <View className="gap-3">
            <SectionHeader title={t('screens.users.role-access-title')} />
            <RoleAccessCard roleLabel={roleLabel} counts={roleCounts} />
          </View>
        </View>
      }>
      <View className="gap-5">
        <View className="gap-1.5">
          <Text variant="h2">{t('screens.users.title')}</Text>
          <Text className="text-foreground-secondary text-sm leading-5">
            {t('screens.users.subtitle')}
          </Text>
        </View>

        <View className="gap-3">
          <SectionHeader title={t('screens.users.members')} />
          <Panel className="gap-1 p-1.5">
            {users.length === 0 ? (
              <EmptyState variant="inline" icon="users" title={t('screens.users.no-users')} />
            ) : users.map((user) => (
              <ListRow
                key={user.id}
                icon="user"
                title={[user.name, user.lastName].filter(Boolean).join(' ')}
                subtitle={`${roleLabel(user.role)} · ${user.isActive ? t('screens.users.active') : t('screens.users.inactive')}`}
                trailing={
                  <>
                    <Button size="sm" variant="ghost" onPress={() => setEditing(user)}>
                      <Text>{t('common.edit')}</Text>
                    </Button>
                    {user.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        accessibilityLabel={t('screens.users.deactivate')}
                        onPress={() => void deactivate(user)}>
                        <Icon name="user-minus" className="text-error-strong size-4" />
                      </Button>
                    ) : null}
                  </>
                }
              />
            ))}
          </Panel>
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
      <InvitationDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSaved={refresh}
        onCreated={setQrPreview}
      />
      <AdaptiveDialog
        open={qrPreview !== null}
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
        {qrPreview ? (
          <View className="items-center pb-1">
            <QrCode value={qrPreview.value} size={220} errorCorrection="M" />
          </View>
        ) : null}
      </AdaptiveDialog>
    </AppScreen>
  );
}
