import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { inviteService } from '@/core/services/invite';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { parseInvitationQr } from '@/shared/libs/invitation-qr';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { InfoRows } from '@/features/auth/components/info-rows';
import { MismatchView } from '@/features/auth/components/mismatch-view';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { INVITATION_ROWS } from '@/features/auth/constants/invitation.constant';
import { useQrScan } from '@/features/auth/hooks/use-qr-scan';
import { invitationCopyOf, invitationOutcomeOf } from '@/features/auth/model/invitation-outcome';
import type { InvitationOutcome } from '@/features/auth/model/invitation-outcome';
import { invitationRevokedText } from '@/features/auth/model/invitation-refusal';
import { holdInviteToken } from '@/features/auth/model/invite-slot';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

const FRESH: InvitationOutcome = { phase: 'idle', role: null, revoked: null, inviter: null };

function revokedOutcome(revoked: string | undefined): InvitationOutcome {
  if (!revoked) return FRESH;
  return {
    phase: 'expired',
    role: null,
    revoked: { moduleId: revoked === 'none' ? null : revoked },
    inviter: null,
  };
}

function InvitationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { next } = useOnboardingNext();
  const { hero } = useOnboardingLayout();
  const params = useLocalSearchParams<{ revoked?: string }>();
  const [outcome, setOutcome] = useState<InvitationOutcome>(() => revokedOutcome(params.revoked));
  const [token, setToken] = useState<string | null>(null);
  const resolve = useCallback(async (value: string) => {
    const qr = parseInvitationQr(value);
    if (!qr) {
      setOutcome({ ...FRESH, phase: 'expired' });
      return;
    }
    setOutcome({ ...FRESH, phase: 'resolving' });
    const answer = await inviteService.accept(qr);
    setToken(qr.token);
    setOutcome(
      invitationOutcomeOf({
        ...answer,
        role: answer.info?.role ?? null,
        inviter: answer.info?.inviterName ?? null,
      })
    );
  }, []);
  const scan = useQrScan('invite', (value) => void resolve(value));
  const start = () => {
    if (token) holdInviteToken(token);
    router.replace(next('invited', 'invitation'));
  };
  const { phase, revoked } = outcome;
  const back = () => router.replace('/welcome');

  if (phase === 'mismatch')
    return <MismatchView onBack={back} onRestart={() => setOutcome(FRESH)} />;
  const copy = invitationCopyOf(outcome);
  const action = {
    accept: { label: t('screens.invitation.accept'), onPress: start },
    understood: { label: t('screens.invitation.understood'), onPress: back },
    scan: { label: t('screens.invitation.scan'), onPress: scan },
  }[copy.action];
  return (
    <OnboardingFrame
      top={<OnboardingTop onBack={back} />}
      footer={
        <Button
          key={copy.action}
          variant="primary"
          block
          icon={copy.action === 'scan' ? 'qr' : undefined}
          busy={phase === 'resolving'}
          {...action}
        />
      }>
      <View className="mt-4 items-center gap-2">
        <Presence state={phase === 'expired' ? 'idle' : 'happy'} size={hero} />
        <Text variant="heroCompact" heading={1} align="center">
          {copy.name ? t('screens.invitation.valid-title-by', { name: copy.name }) : t(copy.title)}
        </Text>
        <Text variant="body" tone="2" align="center">
          {t(copy.lead)}
        </Text>
        {revoked ? (
          <Text variant="meta" tone="2" align="center">
            {invitationRevokedText(revoked, t)}
          </Text>
        ) : null}
      </View>
      {copy.action === 'accept' ? <InfoRows rows={INVITATION_ROWS} /> : null}
      {phase === 'unreachable' ? (
        <View className="mt-6">
          <Notice inline tone="alert" title={t('screens.invitation.unreachable')} />
        </View>
      ) : null}
      <View className="min-h-6 flex-1" />
    </OnboardingFrame>
  );
}

export default function InvitationRoute() {
  return IS_NATIVE ? <InvitationScreen /> : <Redirect href="/welcome" />;
}
