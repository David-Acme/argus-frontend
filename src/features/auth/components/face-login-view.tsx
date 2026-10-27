import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { FaceDenied } from '@/features/auth/components/face-denied';
import { FaceFinder } from '@/features/auth/components/face-finder';
import { FaceLens } from '@/features/auth/components/face-lens';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import type { FaceCapture } from '@/features/auth/hooks/use-face-capture';
import { faceErrorMessage, faceNotRecognised } from '@/features/auth/model/face-error';
import { faceLoginCopyOf } from '@/features/auth/model/face-login';
import { faceProgressOf } from '@/features/auth/model/face-progress';
import { LOGIN_QR_ROUTE } from '@/features/auth/model/login-entry';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';

export type FaceLoginViewProps = { capture: FaceCapture; restoring: boolean };

export function FaceLoginView({ capture, restoring }: FaceLoginViewProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { finder } = useOnboardingLayout();
  const progress = faceProgressOf({
    phase: capture.phase,
    guide: capture.guide.state,
    capturing: capture.capturing,
    done: capture.done,
  });
  const copy = faceLoginCopyOf({ restoring, failed: capture.error !== null, progress });
  const lead =
    capture.error && !faceNotRecognised(capture.error)
      ? faceErrorMessage(capture.error, t)
      : t(copy.lead);
  const other = () => router.push(LOGIN_QR_ROUTE);
  if (capture.denied) return <FaceDenied tone="light" top={{}} onAskAgain={capture.askCamera} />;
  return (
    <OnboardingFrame
      top={<OnboardingTop />}
      footer={
        <>
          {capture.error ? (
            <Button
              variant="primary"
              block
              label={t('screens.face.login.retry')}
              onPress={capture.clearError}
            />
          ) : null}
          <Button variant="ghost" block label={t('screens.face.login.other')} onPress={other} />
        </>
      }>
      <OnboardingHeading title={t(copy.title)} lead={lead} />
      <OnboardingMid>
        <FaceFinder
          size={finder}
          progress={capture.error ? 0 : progress.progress}
          done={capture.done}
          label={t('screens.face.finder-label')}>
          <FaceLens
            active={capture.granted && capture.cameraActive}
            cameraRef={capture.cameraRef}
            detects={capture.guide.available}
            onReady={capture.handleCameraReady}
            onFaces={capture.guide.onFacesDetected}
          />
        </FaceFinder>
        <View>
          <Chip tone={copy.chipTone} icon={copy.chipIcon} label={capture.notice ?? t(copy.chip)} />
        </View>
      </OnboardingMid>
    </OnboardingFrame>
  );
}
