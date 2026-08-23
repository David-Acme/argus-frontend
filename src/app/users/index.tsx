import { inviteService } from '@/core/services/invite.service';
import { netService } from '@/core/services/net';
import { synchronizeService } from '@/core/services/sync';
import { userManagementService } from '@/core/services/user-management.service';
import { useAuthStore } from '@/core/stores';
import type {
  IInvitationRecord,
  IPeopleDirectoryCacheRow,
  IUserManagementRecord,
} from '@/core/interfaces';
import type { InviteRole, MenuOption, TranslateFn, UserRole } from '@/core/types';
import {
  DashboardShell,
  SectionHeading,
} from '@/shared/components/dashboard';
import { Card, CardContent } from '@/shared/components/ui/card';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { QrCode } from '@/shared/components/ui/qr-code';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { DASHBOARD_TAB_ROUTE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { buildInvitationQr } from '@/shared/libs/invitation-qr';
import { toast } from '@/shared/libs/toast';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

const INVITE_EXPIRIES = [
  { value: '1', days: 1 },
  { value: '7', days: 7 },
  { value: '30', days: 30 },
] as const;

type InviteExpiry = (typeof INVITE_EXPIRIES)[number]['value'];

type ManagedUserDialogProps = {
  user: IUserManagementRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

type InvitationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (preview: InvitationPreview) => void;
  onSaved: () => Promise<void>;
};

type InvitationPreview = {
  invitationId: number;
  value: string;
};

const roleOptions = (t: TranslateFn): MenuOption<UserRole>[] => [
  { value: 'owner', label: t('screens.users.role-owner') },
  { value: 'resident', label: t('screens.users.role-resident') },
  { value: 'guard', label: t('screens.users.role-guard') },
  { value: 'guest', label: t('screens.users.role-guest') },
];

const inviteRoleOptions = (t: TranslateFn): MenuOption<InviteRole>[] => [
  { value: 'resident', label: t('screens.users.role-resident') },
  { value: 'guard', label: t('screens.users.role-guard') },
  { value: 'guest', label: t('screens.users.role-guest') },
];

function ManagedUserDialog({ user, open, onOpenChange, onSaved }: ManagedUserDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(user.name);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [saving, setSaving] = useState(false);
  const options = useMemo(() => roleOptions(t), [t]);

  const save = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    const response = await userManagementService.update(user.id, {
      name: name.trim(),
      lastName: lastName.trim(),
      role,
    });
    setSaving(false);
    if (!response.ok) {
      toast.error(t('common.errors.unknown'), response.errors?.message);
      return;
    }
    onOpenChange(false);
    await onSaved();
    toast.success(t('screens.users.user-saved'));
  }, [lastName, name, onOpenChange, onSaved, role, t, user]);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.users.edit-user')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} disabled={!name.trim()} onPress={save}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-3.5 pb-1">
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.name')}</Text>
          <Input value={name} onChangeText={setName} autoCapitalize="words" />
        </View>
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.last-name')}</Text>
          <Input value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        </View>
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.role')}</Text>
          <AdaptiveSelect
            options={options}
            value={role}
            onChange={setRole}
            title={t('screens.users.role')}
            closeLabel={t('common.close')}
            searchPlaceholder={t('screens.home.search-placeholder')}
            emptyLabel={t('screens.users.no-results')}
            trigger={<SelectField label={options.find((option) => option.value === role)?.label} />}
          />
        </View>
      </View>
    </AdaptiveDialog>
  );
}

function InvitationDialog({ open, onOpenChange, onCreated, onSaved }: InvitationDialogProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<InviteRole>('resident');
  const [capacity, setCapacity] = useState('1');
  const [expiry, setExpiry] = useState<InviteExpiry>('7');
  const [saving, setSaving] = useState(false);
  const roles = useMemo(() => inviteRoleOptions(t), [t]);
  const expiryOptions = useMemo<MenuOption<InviteExpiry>[]>(
    () => INVITE_EXPIRIES.map((item) => ({ value: item.value, label: t('screens.users.expires-days', { days: String(item.days) }) })),
    [t],
  );

  const create = useCallback(async () => {
    const maxRedemptions = Number(capacity);
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100) {
      toast.error(t('common.errors.validation'), t('screens.users.capacity-hint'));
      return;
    }
    const days = INVITE_EXPIRIES.find((item) => item.value === expiry)?.days ?? 7;
    setSaving(true);
    const response = await inviteService.create({
      role,
      maxRedemptions,
      expiresAt: Math.floor(Date.now() / 1000) + days * 86_400,
    });
    setSaving(false);
    if (!response.ok || !response.info) {
      toast.error(t('common.errors.unknown'), response.errors?.message);
      return;
    }
    const instance = await netService.instance();
    if (!instance) {
      toast.error(t('common.errors.pairing-required'));
      return;
    }
    onOpenChange(false);
    onCreated({
      invitationId: response.info.id,
      value: buildInvitationQr({
        token: response.info.token,
        host: instance.host,
        ip: instance.ip,
        port: instance.port,
        scheme: 'https',
        instanceId: instance.instanceId,
        caFingerprint: instance.caFingerprint,
      }),
    });
    await onSaved();
  }, [capacity, expiry, onCreated, onOpenChange, onSaved, role, t]);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.users.new-invitation')}
      description={t('screens.users.invitation-description')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} onPress={create}>
            <Text>{t('common.create')}</Text>
          </Button>
        </>
      }>
      <View className="gap-3.5 pb-1">
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.role')}</Text>
          <AdaptiveSelect
            options={roles}
            value={role}
            onChange={setRole}
            title={t('screens.users.role')}
            closeLabel={t('common.close')}
            searchPlaceholder={t('screens.home.search-placeholder')}
            emptyLabel={t('screens.users.no-results')}
            trigger={<SelectField label={roles.find((option) => option.value === role)?.label} />}
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.capacity')}</Text>
          <Input value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
          <Text className="text-muted-foreground text-xs">{t('screens.users.capacity-hint')}</Text>
        </View>
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.expires')}</Text>
          <AdaptiveSelect
            options={expiryOptions}
            value={expiry}
            onChange={setExpiry}
            title={t('screens.users.expires')}
            closeLabel={t('common.close')}
            searchPlaceholder={t('screens.home.search-placeholder')}
            emptyLabel={t('screens.users.no-results')}
            trigger={<SelectField label={expiryOptions.find((option) => option.value === expiry)?.label} />}
          />
        </View>
      </View>
    </AdaptiveDialog>
  );
}

export default function UsersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const currentUser = useAuthStore((state) => state.user);
  const [editing, setEditing] = useState<IUserManagementRecord | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [qrPreview, setQrPreview] = useState<InvitationPreview | null>(null);
  const qrPreviewRef = useRef<InvitationPreview | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const isOwner = currentUser?.role === 'owner';
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
      if (
        !(await confirm({
          title: t('screens.users.deactivate-title', { name: user.name }),
          description: t('screens.users.deactivate-description'),
          confirmLabel: t('screens.users.deactivate'),
          intent: 'danger',
        }))
      )
        return;
      const response = await userManagementService.deactivate(user.id);
      if (!response.ok) {
        toast.error(t('common.errors.unknown'), response.errors?.message);
        return;
      }
      await refresh();
      toast.success(t('screens.users.user-deactivated'));
    },
    [refresh, t],
  );

  const revoke = useCallback(
    async (invitation: IInvitationRecord) => {
      if (
        !(await confirm({
          title: t('screens.users.revoke-title'),
          description: t('screens.users.revoke-description'),
          confirmLabel: t('screens.users.revoke'),
          intent: 'danger',
        }))
      )
        return;
      const response = await inviteService.revoke(invitation.id);
      if (!response.ok) {
        toast.error(t('common.errors.unknown'), response.errors?.message);
        return;
      }
      await refresh();
    },
    [refresh, t],
  );

  const dismissPreview = useCallback(() => {
    const preview = qrPreview;
    qrPreviewRef.current = null;
    setQrPreview(null);
    if (!preview) return;
    void inviteService.revoke(preview.invitationId).then((response) => {
      if (!response.ok) toast.error(t('common.errors.unknown'), response.errors?.message);
      else void refresh();
    });
  }, [qrPreview, refresh, t]);

  const goToTab = useCallback(
    (tab: 'home' | 'schedule' | 'projects' | 'profile') => router.replace(DASHBOARD_TAB_ROUTE[tab]),
    [router],
  );

  const userRoleLabels = useMemo(() => roleOptions(t), [t]);
  const roleLabel = useCallback(
    (role: UserRole) => userRoleLabels.find((option) => option.value === role)?.label ?? role,
    [userRoleLabels],
  );

  if (!isOwner) return <Redirect href="/profile" />;

  return (
    <DashboardShell
      active="profile"
      labels={{
        home: t('screens.home.home'),
        schedule: t('screens.agenda.schedule'),
        projects: t('screens.projects.title'),
        profile: t('screens.home.profile'),
      }}
      composeLabel={t('screens.home.compose')}
      onNavigate={goToTab}
      onCompose={() => router.push('/agenda?new=event')}
      aside={
        invitations.length > 0 ? (
          <View className="gap-3">
            <SectionHeading title={t('screens.users.invitations')} />
            <Card>
              <CardContent className="gap-1">
                {invitations.map((invitation) => {
                  const usable =
                    invitation.revokedAt == null &&
                    invitation.expiresAt * 1000 > now &&
                    invitation.redemptionCount < invitation.maxRedemptions;
                  return (
                    <View key={invitation.id} className="border-border-subtle flex-row items-center gap-3 border-b py-3 last:border-b-0">
                      <Icon name="qr-code" className="text-foreground-secondary size-5" />
                      <View className="min-w-0 flex-1 gap-0.5">
                        <Text>{roleLabel(invitation.role)}</Text>
                        <Text className="text-muted-foreground text-xs">
                          {invitation.redemptionCount}/{invitation.maxRedemptions} · {date.formatDayMonth(new Date(invitation.expiresAt * 1000))}
                        </Text>
                      </View>
                      <Text className={usable ? 'text-success text-xs' : 'text-muted-foreground text-xs'}>
                        {usable ? t('screens.users.active') : t('screens.users.inactive')}
                      </Text>
                      {usable ? (
                        <Pressable onPress={() => void revoke(invitation)} accessibilityLabel={t('screens.users.revoke')}>
                          <Icon name="x" className="text-error size-5" />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </CardContent>
            </Card>
          </View>
        ) : undefined
      }>
      <View className="gap-5">
        <View className="gap-1.5">
          <Text variant="h2">{t('screens.users.title')}</Text>
          <Text className="text-foreground-secondary text-sm leading-5">
            {t('screens.users.subtitle')}
          </Text>
        </View>

        <View className="gap-3">
          <SectionHeading
            title={t('screens.users.members')}
            action={t('screens.users.new-invitation')}
            onAction={() => setInviteOpen(true)}
          />
          <Card>
            <CardContent className="gap-1">
              {users.length === 0 ? (
                <Text className="text-muted-foreground py-3 text-sm">{t('screens.users.no-users')}</Text>
              ) : users.map((user) => (
                <View key={user.id} className="border-border-subtle flex-row items-center gap-3 border-b py-3 last:border-b-0">
                  <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
                    <Icon name="user" className="text-foreground-secondary size-5" />
                  </View>
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text numberOfLines={1}>{[user.name, user.lastName].filter(Boolean).join(' ')}</Text>
                    <Text className="text-muted-foreground text-xs">
                      {roleLabel(user.role)} · {user.isActive ? t('screens.users.active') : t('screens.users.inactive')}
                    </Text>
                  </View>
                  <Button size="sm" variant="ghost" onPress={() => setEditing(user)}>
                    <Text>{t('common.edit')}</Text>
                  </Button>
                  {user.isActive ? (
                    <Button size="sm" variant="ghost" onPress={() => void deactivate(user)}>
                      <Icon name="user-minus" className="text-error size-4" />
                    </Button>
                  ) : null}
                </View>
              ))}
            </CardContent>
          </Card>
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
    </DashboardShell>
  );
}
