import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { afterSignInHref } from '@/core/stores';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { LoginQrCard } from '@/features/auth/components/login-qr-card';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import { LOGIN_APPROVED_PAUSE_MS } from '@/features/auth/constants/login.constant';
import { useLoginQr } from '@/features/auth/hooks/use-login-qr';
import type { LoginQr } from '@/features/auth/hooks/use-login-qr';
import { loginEntry } from '@/features/auth/model/login-entry';
import { loginActionOf, loginHeadingOf, showsQr } from '@/features/auth/model/login-screen';

type LoginFooterProps = { qr: LoginQr };

const FACE_LOGIN = '/welcome/face?mode=login';

const PHONE = IS_NATIVE;

function LoginFooter({ qr }: LoginFooterProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const primary = loginActionOf(qr.phase);
  return (
    <>
      {primary ? (
        <Button
          variant="primary"
          block
          label={t(primary.label)}
          onPress={primary.action === 'refresh' ? qr.refresh : qr.retryOwner}
        />
      ) : null}
      {PHONE ? (
        <Button
          variant="ghost"
          block
          label={t('screens.login.face')}
          onPress={() => router.replace(FACE_LOGIN)}
        />
      ) : null}
    </>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { method } = useLocalSearchParams<{ method?: string }>();
  const entry = loginEntry({ isNative: PHONE, method });
  const qr = useLoginQr(entry === 'qr');
  const heading = loginHeadingOf(qr.phase, PHONE);

  useEffect(() => {
    if (qr.phase !== 'approved') return;
    const timer = setTimeout(() => router.replace(afterSignInHref()), LOGIN_APPROVED_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [qr.phase, router]);

  if (entry === 'face') return <Redirect href={FACE_LOGIN} />;
  return (
    <OnboardingFrame footer={<LoginFooter qr={qr} />}>
      <OnboardingHeading title={t(heading.title)} lead={t(heading.lead)} mark="estela" />
      <OnboardingMid>{showsQr(qr.phase) ? <LoginQrCard qr={qr} /> : null}</OnboardingMid>
    </OnboardingFrame>
  );
}
