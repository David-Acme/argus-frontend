import { inviteService } from '@/core/services/invite';
import { netService } from '@/core/services/net';

import type { InviteRole, MenuOption } from '@/core/types';

import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';

import { Input } from '@/shared/components/ui/input';

import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';

import { useTranslation } from '@/shared/hooks/use-translation';

import { buildInvitationQr } from '@/shared/libs/invitation-qr';
import { toast } from '@/shared/libs/toast';

import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { INVITE_EXPIRIES, type InvitationDialogProps, type InviteExpiry, inviteRoleOptions } from '@/features/people/components/user-options';

export function InvitationDialog({ open, onOpenChange, onCreated, onSaved }: InvitationDialogProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState<InviteRole>('resident');
  const [capacity, setCapacity] = useState('1');
  const [expiry, setExpiry] = useState<InviteExpiry>('7');
  const { run, pending: saving } = useServiceAction();
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
    const response = await run({
      call: () =>
        inviteService.create({ role, maxRedemptions, expiresAt: Math.floor(Date.now() / 1000) + days * 86_400 }),
    });
    if (!response?.info) return;
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
  }, [capacity, expiry, onCreated, onOpenChange, onSaved, role, run, t]);

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
        <View className="gap-1.5">
          <Text variant="caption" className="text-foreground-secondary">{t('screens.users.capacity')}</Text>
          <Input value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
          <Text variant="caption">{t('screens.users.capacity-hint')}</Text>
        </View>
        <View className="gap-1.5">
          <Text variant="caption" className="text-foreground-secondary">{t('screens.users.expires')}</Text>
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

