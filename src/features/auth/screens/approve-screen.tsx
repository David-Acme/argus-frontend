import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { ApproveCard } from '@/features/auth/components/approve-card';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { APPROVE_CLOSE_MS } from '@/features/auth/constants/login.constant';
import { useApprove } from '@/features/auth/hooks/use-approve';
import { useQrScan } from '@/features/auth/hooks/use-qr-scan';
import { approveNoteOf, approveTitleOf, deviceGlyphOf } from '@/features/auth/model/approve';

export default function ApproveScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const flow = useApprove();
  const scan = useQrScan('login', (value) => void flow.scanned(value));
  const { details, phase } = flow;
  const confirming = details !== null && (phase === 'confirm' || phase === 'approving');
  const note = approveNoteOf(phase);
  const back = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace('/')),
    [router]
  );

  useEffect(() => {
    if (phase !== 'approved' && phase !== 'denied') return;
    const timer = setTimeout(back, APPROVE_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [back, phase]);

  return (
    <OnboardingFrame
      top={<OnboardingTop onBack={back} />}
      footer={
        confirming ? (
          <>
            <Button
              variant="primary"
              block
              label={t('screens.approve.confirm')}
              onPress={flow.approve}
              busy={phase === 'approving'}
            />
            <Button variant="danger" block label={t('screens.approve.deny')} onPress={flow.deny} />
          </>
        ) : (
          <Button
            variant="primary"
            block
            icon="qr"
            label={t(
              phase === 'idle' || phase === 'checking'
                ? 'screens.approve.scan'
                : 'screens.approve.again'
            )}
            onPress={scan}
            busy={phase === 'checking'}
          />
        )
      }>
      <OnboardingHeading
        title={confirming ? t(approveTitleOf(details.platform)) : t('screens.approve.title')}
        lead={confirming ? t('screens.approve.confirm-lead') : t('screens.approve.lead')}
        mark={{ icon: confirming ? deviceGlyphOf(details.platform) : 'qr' }}
      />
      <OnboardingMid>
        {confirming ? <ApproveCard details={details} /> : null}
        {note ? (
          <View className="w-full" accessibilityLiveRegion="polite">
            <Notice inline tone={note.tone} title={t(note.key)} />
          </View>
        ) : null}
      </OnboardingMid>
    </OnboardingFrame>
  );
}
