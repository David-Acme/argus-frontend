import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Text } from '@/shared/ui/text';
import { FaceDenied } from '@/features/auth/components/face-denied';
import { FaceFinder } from '@/features/auth/components/face-finder';
import { FaceLens } from '@/features/auth/components/face-lens';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingMid } from '@/features/auth/components/onboarding-mid';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import type { OnboardingPlace } from '@/features/auth/components/onboarding-top';
import { PrivacyLine } from '@/features/auth/components/privacy-line';
import type { FaceCapture } from '@/features/auth/hooks/use-face-capture';
import { faceErrorMessage } from '@/features/auth/model/face-error';
import { faceProgressOf } from '@/features/auth/model/face-progress';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';

export type FaceEnrollViewProps = {
  capture: FaceCapture;
  place: OnboardingPlace;
  onBack: () => void;
};

export function FaceEnrollView({ capture, place, onBack }: FaceEnrollViewProps) {
  const { t } = useTranslation();
  const { finder } = useOnboardingLayout();
  const { progress, cue } = faceProgressOf({
    phase: capture.phase,
    guide: capture.guide.state,
    capturing: capture.capturing,
    done: capture.done,
  });
  const top = { onBack, place };
  if (capture.denied) return <FaceDenied tone="dark" top={top} onAskAgain={capture.askCamera} />;
  return (
    <OnboardingFrame
      tone="dark"
      top={<OnboardingTop {...top} />}
      footer={
        <Button
          variant="ghost"
          block
          label={t('screens.face.manual')}
          onPress={capture.captureManually}
          disabled={!capture.manualAvailable || capture.phase !== 'guide' || capture.capturing}
        />
      }>
      <OnboardingMid>
        <View accessibilityLiveRegion="polite">
          <Text variant="section" heading={1} align="center">
            {t(cue)}
          </Text>
        </View>
        <FaceFinder
          size={finder}
          progress={progress}
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
        {capture.error ? (
          <View className="w-full">
            <Notice inline tone="alert" title={faceErrorMessage(capture.error, t)} />
          </View>
        ) : null}
        {capture.notice ? (
          <View className="w-full">
            <Notice inline tone="ok" title={capture.notice} />
          </View>
        ) : null}
        <PrivacyLine text={t('screens.face.privacy')} />
      </OnboardingMid>
    </OnboardingFrame>
  );
}
