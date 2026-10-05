import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { inviteService } from '@/core/services/invite';
import { synchronizeService } from '@/core/services/sync';
import type { IInvitationRecord, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { AuthSession, UserRole } from '@/core/types';
import { AppScreen } from '@/shared/components/layout';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { cn } from '@/shared/libs/utils';
import {
  ConnectedDevicesPanel,
  type ConnectedPerson,
  useConnectedDevices,
  UserSessionsDialog,
} from '@/features/sessions';
import { InvitationDialog } from '@/features/people/components/invitation-dialog';
import { InvitationPreviewDialog } from '@/features/people/components/invitation-preview-dialog';
import { InvitationsPanel } from '@/features/people/components/invitations-panel';
import { ManagedUserDialog } from '@/features/people/components/managed-user-dialog';
import { MembersPanel } from '@/features/people/components/members-panel';
import { RoleAccessCard } from '@/features/people/components/role-access-card';
import { VoiceRecognitionRow } from '@/features/people/components/voice-recognition-row';
import { HouseholdPrivacyPanel, UserPrivacyRow } from '@/features/privacy';
import { VisitorsPreviewPanel } from '@/features/visitors';
import { roleOptions } from '@/features/people/components/user-options';
import { useInvitationPreview } from '@/features/people/hooks/use-invitation-preview';
import {
  INVITATION_LENSES,
  invitationStateOf,
  USER_LENSES,
} from '@/features/people/model/people-optimistic';
import { userManagementService } from '@/features/people/services/user-management.service';

const MINUTE_MS = 60_000;

export default function UsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isWide } = useWindowClass();
  const currentUserId = String(useAuthStore((state) => state.user?.id ?? ''));
  const [editing, setEditing] = useState<IPeopleDirectoryCacheRow | null>(null);
  const [inspecting, setInspecting] = useState<number | null>(null);
  const devices = useConnectedDevices();
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

  const inspectedUser =
    inspecting === null ? null : (users.find((user) => user.id === String(inspecting)) ?? null);

  const refresh = useCallback(() => {
    void synchronizeService.syncOnce();
  }, []);
  const isSpent = useCallback(
    (invitationId: number) => {
      const record = invitations.find((invitation) => invitation.id === invitationId);
      return record != null && invitationStateOf(record, Date.now()) !== 'waiting';
    },
    [invitations]
  );
  const {
    preview,
    show: showPreview,
    dismiss: dismissPreview,
  } = useInvitationPreview({ onRevoked: refresh, isSpent });
  const previewRecord =
    preview === null
      ? null
      : (invitations.find((invitation) => invitation.id === preview.invitationId) ?? null);

  const roleLabel = useCallback(
    (role: UserRole) => roleLabels.find((option) => option.value === role)?.label ?? role,
    [roleLabels]
  );

  const fullName = useCallback(
    (user: IPeopleDirectoryCacheRow) => [user.name, user.lastName].filter(Boolean).join(' '),
    []
  );

  const personOf = useCallback(
    (userId: number): ConnectedPerson => {
      const user = users.find((candidate) => candidate.id === String(userId));
      return {
        name: user ? fullName(user) : t('screens.users.unknown-user', { id: String(userId) }),
        detail: user ? roleLabel(user.role) : t('screens.users.unknown-role'),
        isSelf: String(userId) === currentUserId,
      };
    },
    [currentUserId, fullName, roleLabel, t, users]
  );

  const setActive = useCallback(
    (user: IPeopleDirectoryCacheRow, isActive: boolean, sessions: readonly AuthSession[]) => {
      const name = fullName(user);
      const prefix = isActive ? 'enable' : 'disable';
      void runOptimistic({
        confirm: {
          title: t(`screens.sessions.admin.confirm-${prefix}-title`, { name }),
          description: t(`screens.sessions.admin.confirm-${prefix}-description`),
          confirmLabel: t(`screens.sessions.admin.${prefix}`),
          intent: isActive ? 'warning' : 'danger',
        },
        intents: [
          { table: 'user', kind: 'update', recordId: user.id, values: { isActive } },
          ...(isActive
            ? []
            : sessions.map((session) => ({
                table: 'session' as const,
                kind: 'delete' as const,
                recordId: session.id,
              }))),
        ],
        call: () => userManagementService.update(Number(user.id), { isActive }),
        success: t(`screens.sessions.admin.${isActive ? 'enabled' : 'disabled'}`, { name }),
      }).then((response) => {
        if (!response) return;
        if (!isActive) devices.forget(Number(user.id));
        refresh();
        void devices.reload();
      });
    },
    [devices, fullName, refresh, t]
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
    [refresh, t]
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AppScreen
        fillHeight={false}
        aside={
          <View className={cn(isWide && 'flex-1', 'gap-5')}>
            <View className="gap-3">
              <SectionHeader title={t('screens.users.role-access-title')} />
              <RoleAccessCard roleLabel={roleLabel} counts={roleCounts} />
            </View>
            <View className="gap-3">
              <SectionHeader title={t('screens.privacy.household.title')} />
              <HouseholdPrivacyPanel />
            </View>
            <View className={cn(isWide && 'flex-1', 'gap-3')}>
              <SectionHeader
                title={t('screens.users.invitations')}
                count={invitations.length}
                action={t('screens.users.new-invitation')}
                onAction={() => setInviteOpen(true)}
              />
              <InvitationsPanel
                invitations={invitations}
                now={now}
                roleLabel={roleLabel}
                onRevoke={revoke}
              />
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

          <View className="gap-3">
            <SectionHeader title={t('screens.users.members')} count={users.length} />
            <MembersPanel
              users={users}
              currentUserId={currentUserId}
              roleLabel={roleLabel}
              devicesOf={(user) => devices.sessionsOf(Number(user.id)).length}
              onEdit={setEditing}
              onOpenAccess={(user) => setInspecting(Number(user.id))}
              onInvite={() => setInviteOpen(true)}
            />
          </View>

          <View className="gap-3">
            <SectionHeader
              title={t('screens.visitors.section')}
              action={t('screens.visitors.see-all')}
              onAction={() => router.push('/users/visitors')}
            />
            <VisitorsPreviewPanel />
          </View>

          <View className={cn(isWide && 'flex-1', 'gap-3')}>
            <SectionHeader
              title={t('screens.sessions.admin.title')}
              count={devices.users.length}
            />
            <ConnectedDevicesPanel
              className={isWide ? 'flex-1' : undefined}
              users={devices.users}
              now={devices.now}
              loading={devices.loading}
              failed={devices.failed}
              personOf={personOf}
              onOpen={setInspecting}
              onRetry={() => void devices.reload()}
            />
          </View>
        </View>
      </AppScreen>

      {inspectedUser ? (
        <UserSessionsDialog
          key={inspectedUser.id}
          open
          subject={{
            userId: Number(inspectedUser.id),
            name: fullName(inspectedUser),
            roleLabel: roleLabel(inspectedUser.role),
            isActive: inspectedUser.isActive,
            isSelf: inspectedUser.id === currentUserId,
          }}
          now={devices.now}
          fallback={devices.sessionsOf(Number(inspectedUser.id))}
          onOpenChange={(open) => !open && setInspecting(null)}
          onCloseSession={(session, deviceLabel) =>
            void devices.closeSession({
              userId: Number(inspectedUser.id),
              session,
              deviceLabel,
            })
          }
          onCloseAll={(sessions) =>
            void devices.closeEverySession({
              userId: Number(inspectedUser.id),
              userName: fullName(inspectedUser),
              sessions,
            })
          }
          onDisable={(sessions) => setActive(inspectedUser, false, sessions)}
          onEnable={() => setActive(inspectedUser, true, [])}
          extra={
            <>
              <UserPrivacyRow userId={Number(inspectedUser.id)} />
              <VoiceRecognitionRow
                userId={Number(inspectedUser.id)}
                name={fullName(inspectedUser)}
              />
            </>
          }
        />
      ) : null}
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
        onCreated={showPreview}
      />
      <InvitationPreviewDialog
        preview={preview}
        record={previewRecord}
        roleLabel={preview ? roleLabel(preview.role) : ''}
        now={now}
        onDismiss={dismissPreview}
      />
    </>
  );
}
