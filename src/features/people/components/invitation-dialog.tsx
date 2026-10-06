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
import { isRoleOffered } from '@/shared/libs/capabilities';
import { buildInvitationQr } from '@/shared/libs/invitation-qr';
import { toast } from '@/shared/libs/toast';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { type InvitationDialogProps, inviteRoleOptions } from '@/features/people/components/user-options';

export function InvitationDialog({ open, onOpenChange, onCreated, onSaved }: InvitationDialogProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<InviteRole>('resident');
  const { run, pending: saving } = useServiceAction();
  const view = useAccessView();
  const roles = useMemo(() => inviteRoleOptions(t, (candidate) => isRoleOffered(view, candidate)), [t, view]);

  const create = useCallback(async () => {
    const response = await run({ call: () => inviteService.create({ role }) });
    if (!response?.info) return;
    const instance = await netService.instance();
    if (!instance) {
      void inviteService.revoke(response.info.id);
      toast.error(t('common.errors.pairing-required'));
      return;
    }
    onOpenChange(false);
    onCreated({
      invitationId: response.info.id,
      role: response.info.role,
      expiresAt: response.info.expiresAt,
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
    onSaved();
  }, [onCreated, onOpenChange, onSaved, role, run, t]);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.users.new-invitation')}
      description={t('screens.users.invitation-description')}
      closeLabel={t('common.close')}
      onSubmit={() => void create()}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} onPress={create}>
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
            searchPlaceholder={t('screens.home.search-placeholder')}
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
