import { View } from 'react-native';
import type { IInvitationRecord } from '@/core/interfaces';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { QrCode } from '@/shared/components/ui/qr-code';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { InvitationPreview } from '@/features/people/components/user-options';
import { invitationStateOf } from '@/features/people/model/people-optimistic';

type InvitationPreviewDialogProps = {
  preview: InvitationPreview | null;
  record: IInvitationRecord | null;
  roleLabel: string;
  now: number;
  onDismiss: () => void;
};

export function InvitationPreviewDialog({
  preview,
  record,
  roleLabel,
  now,
  onDismiss,
}: InvitationPreviewDialogProps) {
  const { t } = useTranslation();
  const state = preview
    ? invitationStateOf(
        record ?? {
          revokedAt: null,
          expiresAt: preview.expiresAt,
          redemptionCount: 0,
          maxRedemptions: 1,
        },
        now
      )
    : 'waiting';

  return (
    <AdaptiveDialog
      open={preview !== null}
      onOpenChange={(open) => !open && onDismiss()}
      title={
        state === 'used' ? t('screens.users.invitation-used-title') : t('screens.users.invitation-ready')
      }
      description={
        state === 'used'
          ? t('screens.users.invitation-used-description', { role: roleLabel })
          : t('screens.users.invitation-ready-description')
      }
      closeLabel={t('common.close')}
      contentClassName="sm:max-w-[380px]"
      footer={
        <Button onPress={onDismiss}>
          <Text>{state === 'waiting' ? t('screens.users.close-qr') : t('common.close')}</Text>
        </Button>
      }>
      {preview ? (
        <View className="items-center gap-4 pb-1">
          {state === 'waiting' ? (
            <QrCode value={preview.value} size={220} errorCorrection="M" />
          ) : (
            <View className="bg-surface-secondary size-[220px] items-center justify-center gap-3 rounded-3xl px-6">
              <Icon
                name={state === 'used' ? 'user-check' : 'qr-code'}
                className={state === 'used' ? 'text-success size-10' : 'text-foreground-secondary size-10'}
              />
              <Text variant="label" className="text-center">
                {t(`screens.users.invitation-state.${state}`)}
              </Text>
            </View>
          )}
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <StatusBadge label={roleLabel} />
            <StatusBadge
              label={t('screens.users.single-use')}
              icon="shield-check"
              iconClassName="text-foreground-secondary"
            />
          </View>
          {state === 'waiting' ? (
            <Text variant="caption" className="text-center">
              {t('screens.users.close-qr-hint')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </AdaptiveDialog>
  );
}
