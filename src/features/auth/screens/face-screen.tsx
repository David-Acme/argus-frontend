import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { FaceGuideOverlay } from '@/features/auth/components/face-guide-overlay';
import { FaceCaptureSheet } from '@/features/auth/components/face-capture-sheet';
import { FaceIntro } from '@/features/auth/components/face-intro';
import { FaceWebNotice } from '@/features/auth/components/face-web-notice';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { useFaceCapture } from '@/features/auth/hooks/use-face-capture';
import { IS_ANDROID, IS_NATIVE } from '@/shared/constants';
import { ONBOARDING_STEPS } from '@/features/auth/constants/welcome';
import { faceErrorMessage } from '@/features/auth/model/face-error';
import { CameraView } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_ESTIMATE = 260;

export default function FaceScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mode = 'owner-enroll' } = useLocalSearchParams<{ mode?: string }>();
  const [sheetHeight, setSheetHeight] = useState(0);
  const {
    t,
    enrolling,
    cameraRef,
    granted,
    denied,
    showIntro,
    requesting,
    start,
    phase,
    capturing,
    error,
    notice,
    manualAvailable,
    guide,
    cameraActive,
    handleCameraReady,
    captureManually,
  } = useFaceCapture({ mode });

  const handleSheetLayout = useCallback((e: LayoutChangeEvent) => {
    setSheetHeight(e.nativeEvent.layout.height);
  }, []);

  const sheetTop = height - (sheetHeight > 0 ? sheetHeight : SHEET_ESTIMATE);
  const cameraArea = { top: insets.top, height: Math.max(sheetTop - insets.top, 120) };

  if (!IS_NATIVE) return <FaceWebNotice mode={mode} />;

  if (showIntro) {
    return (
      <View
        className="bg-background flex-1 justify-center px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        {enrolling ? (
          <OnboardingSteps
            current={ONBOARDING_STEPS.face}
            total={ONBOARDING_STEPS.total}
            className="mb-8 w-full max-w-md self-center"
          />
        ) : null}
        <FaceIntro enrolling={enrolling} requesting={requesting} onStart={start} />
      </View>
    );
  }

  const sending = phase === 'submitting' || (phase === 'countdown' && capturing);
  const titleKey = sending
    ? enrolling
      ? 'screens.face.enrolling'
      : 'screens.face.logging'
    : phase === 'countdown'
      ? 'screens.face.hold-still'
      : 'screens.face.position-face';
  const hintKey = sending ? null : 'screens.face.position-hint';
  const friendlyError = error ? faceErrorMessage(error, t) : null;

  return (
    <View className="bg-background flex-1 justify-end" style={{ paddingTop: insets.top }}>
      {granted && cameraActive ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mute
          animateShutter={false}
          onCameraReady={handleCameraReady}
          faceDetectionEnabled={IS_ANDROID ? cameraActive && guide.available : undefined}
          onFacesDetected={IS_ANDROID ? guide.onFacesDetected : undefined}
          active
        />
      ) : (
        <View className="bg-surface absolute inset-0 items-center justify-center">
          {denied ? (
            <View className="items-center gap-4 px-8">
              <Icon name="scan-face" className="text-placeholder size-10" />
              <View className="items-center gap-1.5">
                <Text variant="headline" className="text-center">
                  {t('screens.face.permission-title')}
                </Text>
                <Text variant="caption" className="text-foreground-secondary text-center">
                  {t('screens.face.permission-hint')}
                </Text>
              </View>
              <Button variant="outline" size="lg" onPress={() => void Linking.openSettings()}>
                <Text>{t('common.open-settings')}</Text>
              </Button>
            </View>
          ) : (
            <Icon name="scan-face" className="text-placeholder size-10" />
          )}
        </View>
      )}

      {phase === 'guide' && !notice && granted ? (
        <FaceGuideOverlay
          state={guide.state}
          offset={guide.offset}
          available={guide.available}
          area={cameraArea}
        />
      ) : null}

      <FaceCaptureSheet
        enrolling={enrolling}
        title={t(titleKey)}
        hint={hintKey ? t(hintKey) : null}
        error={error}
        friendlyError={friendlyError}
        notice={notice}
        submitting={phase === 'submitting'}
        manualCapture={manualAvailable && phase === 'guide' && !capturing}
        onManualCapture={captureManually}
        onLayout={handleSheetLayout}
      />
    </View>
  );
}
