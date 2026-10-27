import { View } from 'react-native';
import type { IInvitationRecord } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { LazyQrCode } from '@/shared/components/ui/lazy-qr-code';
import { QR_COLORS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import { size } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Choice } from '@/shared/ui/choice';
import { Notice } from '@/shared/ui/notice';
import { Sheet } from '@/shared/ui/sheet';
import { Text } from '@/shared/ui/text';
import type { Invite } from '@/features/people/hooks/use-invite';
import { previewLifecycle } from '@/features/people/model/invitations';
import type { InvitationPreview } from '@/features/people/model/invitations';
import { invitationStateOf } from '@/features/people/model/people-optimistic';
import type { InvitationState } from '@/features/people/model/people-optimistic';

export type InviteSheetProps = { invite: Invite };

export type InvitationQrSheetProps = {
  preview: InvitationPreview | null;
  record: IInvitationRecord | null;
  now: number;
  onDismiss: () => void;
};

type QrStateProps = { state: InvitationState; role: string };

const QR_FRAME = { backgroundColor: QR_COLORS.background };

const STATE_LINE: Readonly<Record<InvitationState, TranslationKey>> = {
  waiting: 'screens.users.invitation-state.waiting',
  used: 'screens.users.invitation-state.used',
  closed: 'screens.users.invitation-state.closed',
  lapsed: 'screens.users.invitation-state.lapsed',
};

export function InviteSheet({ invite }: InviteSheetProps) {
  const { t } = useTranslation();
  return (
    <Sheet
      open={invite.open}
      onClose={invite.close}
      title={t('screens.users.new-invitation')}
      variant="form"
      actions={{ primary: { label: t('screens.users.show-qr'), onPress: invite.create } }}>
      <View className="gap-4">
        <Text variant="body" tone="2">
          {t('screens.users.invitation-description')}
        </Text>
        <Choice
          label={t('screens.users.role')}
          look="field"
          options={invite.roles.map((role) => ({ value: role, label: roleLabelOf(role, t) }))}
          value={invite.role}
          onChange={invite.pick}
        />
        {invite.offRoles ? (
          <Notice inline icon="lock" title={t('screens.users.roles-off')} />
        ) : null}
        <Notice
          icon="shieldok"
          title={t('screens.users.single-use')}
          body={t('screens.users.single-use-hint')}
        />
      </View>
    </Sheet>
  );
}

function QrState({ state, role }: QrStateProps) {
  const { t } = useTranslation();
  return (
    <View className="size-login-qr rounded-media bg-fill items-center justify-center gap-3 px-6">
      <Avatar icon={state === 'used' ? 'check' : 'qr'} tone={state === 'used' ? 'ok' : 'default'} />
      <Text variant="label" align="center">
        {state === 'used'
          ? t('screens.users.invitation-used-description', { role })
          : t(STATE_LINE[state])}
      </Text>
    </View>
  );
}

export function InvitationQrSheet({ preview, record, now, onDismiss }: InvitationQrSheetProps) {
  const { t } = useTranslation();
  const state = preview ? invitationStateOf(previewLifecycle(preview, record), now) : 'waiting';
  const role = preview ? roleLabelOf(preview.role, t) : '';
  return (
    <Sheet
      open={preview !== null}
      onClose={onDismiss}
      title={
        state === 'used'
          ? t('screens.users.invitation-used-title')
          : t('screens.users.invitation-ready')
      }
      variant="detail"
      actions={{
        primary: {
          label: state === 'waiting' ? t('screens.users.close-qr') : t('common.close'),
          onPress: onDismiss,
        },
      }}>
      {preview ? (
        <View className="items-center gap-4">
          {state === 'waiting' ? (
            <View
              className="rounded-media p-4"
              style={QR_FRAME}
              role="img"
              aria-label={t('screens.users.qr-label', { role })}>
              <LazyQrCode value={preview.value} size={size.loginQr} quietZone={0} />
            </View>
          ) : (
            <QrState state={state} role={role} />
          )}
          <Text variant="headline" align="center">
            {t('screens.users.invitation-for', { role })}
          </Text>
          <Text variant="meta" tone="2" align="center">
            {state === 'waiting'
              ? t('screens.users.close-qr-hint')
              : t('screens.users.invitation-ready-description')}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}
