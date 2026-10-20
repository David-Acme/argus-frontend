import type { IInviteCreated } from '@/core/interfaces';
import { inviteService } from '@/core/services/invite';
import { netService } from '@/core/services/net';
import type { InviteRole } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { offModuleOfRole } from '@/shared/libs/capabilities';
import { buildInvitationQr } from '@/shared/libs/invitation-qr';
import { roleLabelOf } from '@/shared/libs/role-label';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { type InvitationDialogProps, inviteRoleOptions } from '@/features/people/components/user-options';
import { createInvitationFlight } from '@/features/people/model/invitation-flight';

export function InvitationDialog({ open, onOpenChange, onCreated, onSaved }: InvitationDialogProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<InviteRole>('resident');
  const [saving, setSaving] = useState(false);
  const view = useAccessView();
  const moduleOff = useCallback(
    (candidate: string) => {
      const moduleId = offModuleOfRole(view, candidate);
      return moduleId === null ? null : (view.moduleNames.get(moduleId) ?? moduleId);
    },
    [view]
  );
  const roles = useMemo(() => inviteRoleOptions(t, moduleOff), [moduleOff, t]);
  const [flight] = useState(() =>
    createInvitationFlight<IInviteCreated>((created) => void inviteService.revoke(created.id))
  );

  const requestInvitation = useCallback(async (): Promise<IInviteCreated | null> => {
    const answer = await inviteService.create({ role });
    if (answer.ok && answer.info) return answer.info;
    if (answer.errors?.code === 'ROLE_INACTIVE') {
      toast.error(
        t('screens.users.invite-role-off-title'),
        t('screens.users.invite-role-off', { role: roleLabelOf(role, t), module: moduleOff(role) ?? '' })
      );
    } else {
      toastServiceError(answer.errors);
    }
    return null;
  }, [moduleOff, role, t]);

  const close = useCallback(
    (next: boolean) => {
      if (!next) flight.abandon();
      onOpenChange(next);
    },
    [flight, onOpenChange]
  );

  const create = useCallback(async () => {
    if (flight.busy()) return;
    setSaving(true);
    const created = await flight.run(requestInvitation);
    setSaving(false);
    if (!created) return;
    const instance = await netService.instance();
    if (!instance) {
      void inviteService.revoke(created.id);
      toast.error(t('common.errors.pairing-required'));
      return;
    }
    onOpenChange(false);
    onCreated({
      invitationId: created.id,
      role: created.role,
      expiresAt: created.expiresAt,
      value: buildInvitationQr({
        token: created.token,
        host: instance.host,
        ip: instance.ip,
        port: instance.port,
        scheme: 'https',
        instanceId: instance.instanceId,
        caFingerprint: instance.caFingerprint,
      }),
    });
    onSaved();
  }, [flight, onCreated, onOpenChange, onSaved, requestInvitation, t]);

  useEffect(() => () => flight.abandon(), [flight]);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={close}
      title={t('screens.users.new-invitation')}
      description={t('screens.users.invitation-description')}
      closeLabel={t('common.close')}
      onSubmit={saving ? undefined : () => void create()}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => close(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} disabled={saving} onPress={create}>
            <Text>{t('screens.users.show-qr')}</Text>
          </Button>
        </>
      }>
      <View className="gap-3.5 pb-1">
        <View className="gap-1.5">
          <Text variant="caption" className="text-foreground-secondary">{t('screens.users.role')}</Text>
          <AdaptiveSelect
            options={roles}
            value={role}
            onChange={setRole}
            title={t('screens.users.role')}
            closeLabel={t('common.close')}
            searchPlaceholder={t('common.search')}
            emptyLabel={t('screens.users.no-results')}
            trigger={<SelectField label={roles.find((option) => option.value === role)?.label} />}
          />
        </View>
        <View className="bg-surface-secondary flex-row gap-3 rounded-2xl px-4 py-3.5">
          <Icon name="shield-check" className="text-foreground-secondary mt-0.5 size-5" />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text variant="label">{t('screens.users.single-use')}</Text>
            <Text variant="caption">{t('screens.users.single-use-hint')}</Text>
          </View>
        </View>
      </View>
    </AdaptiveDialog>
  );
}
