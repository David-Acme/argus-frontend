import { authService } from '@/core/services/auth.service';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { FaceGuideOverlay } from '@/shared/components/face/face-guide-overlay';
import { FaceCaptureSheet } from '@/shared/components/face/face-capture-sheet';
import { FaceIntro } from '@/shared/components/face/face-intro';
import { FaceWebNotice } from '@/shared/components/face/face-web-notice';
import { OnboardingSteps } from '@/shared/components/onboarding';
import { useFaceGuide } from '@/shared/hooks/use-face-guide';
import {
  FACE_CAPTURE_READY_TIMEOUT_MS,
  FACE_CAPTURE_SETTLE_MS,
  FACE_MANUAL_CAPTURE_DELAY_MS,
  ONBOARDING_STEPS,
  IS_ANDROID,
  IS_NATIVE,
} from '@/shared/constants';
import { log } from '@/core/services/log';
import { faceErrorFromUnknown, faceErrorMessage, type FaceError } from '@/shared/libs/face-error';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Vibration,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_ESTIMATE = 260;

type Phase = 'guide' | 'countdown' | 'submitting';

export default function FaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mode = 'owner-enroll', inviteToken } = useLocalSearchParams<{
    mode?: string;
    inviteToken?: string;
  }>();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const capturingRef = useRef(false);
  const captureAttemptRef = useRef(0);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('guide');
  const resetGuideRef = useRef<() => void>(() => {});
  const guideRef = useRef<ReturnType<typeof useFaceGuide> | null>(null);
  const cameraReadyRef = useRef(false);
  const cameraReadyWaiterRef = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<Phase>('guide');
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<FaceError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const enrolling = mode === 'owner-enroll' || mode === 'invite-enroll';
  const [started, setStarted] = useState(!enrolling);
  const [requesting, setRequesting] = useState(false);
  const [asked, setAsked] = useState(false);
  const [manualAvailable, setManualAvailable] = useState(false);

  const granted = permission?.granted === true;
  const denied = asked && permission !== null && !permission.granted && !permission.canAskAgain;
  const showIntro = !denied && (!started || (!granted && !requesting));

  const start = useCallback(async () => {
    setStarted(true);
    if (permission?.granted) return;
    setRequesting(true);
    await requestPermission();
    setAsked(true);
    setRequesting(false);
  }, [permission?.granted, requestPermission]);

  const cameraActive = granted && !notice && phase !== 'submitting';
  const sampling = cameraActive && !capturing && (phase === 'guide' || phase === 'countdown');

  const guide = useFaceGuide({
    cameraRef,
    active: sampling,
    onReady: () => {
      if (phaseRef.current !== 'guide') return;
      captureAttemptRef.current += 1;
      phaseRef.current = 'countdown';
      Vibration.vibrate(80);
      setPhase('countdown');
    },
    onDrift: () => {
      captureAttemptRef.current += 1;
      if (phaseRef.current !== 'countdown') return;
      phaseRef.current = 'guide';
      resetGuideRef.current();
      setPhase('guide');
    },
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    if (!cameraActive) cameraReadyRef.current = false;
  }, [cameraActive]);
  useEffect(() => {
    resetGuideRef.current = guide.reset;
    guideRef.current = guide;
  }, [guide]);

  const submit = useCallback(
    async (uri: string) => {
      setError(null);
      setNotice(null);
      setPhase('submitting');
      try {
        const response = enrolling
          ? await authService.register({
              imageUri: uri,
              ...(mode === 'invite-enroll' && inviteToken ? { inviteCode: inviteToken } : {}),
            })
          : await authService.login(uri);
        if (response.ok && response.info) {
          const already = response.info.alreadyRegistered === true;
          const isOwner = response.info.role === 'owner';
          if (already && !isOwner) {
            setPhase('guide');
            setNotice(
              t('screens.face.already-registered', { name: response.info.name || '—' }),
            );
            redirectTimer.current = setTimeout(() => router.replace('/'), 2800);
            return;
          }
          router.replace(enrolling ? '/welcome/voice' : '/');
          return;
        }
        const apiError = response.errors ?? {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}`,
        };
        log.debug('face', 'backend rejected captured image', {
          mode,
          status: response.status,
          code: apiError.code,
          message: apiError.message,
          fields: apiError.fields,
        });
        setPhase('guide');
        setError({ ...apiError, status: response.status });
      } catch (submitError) {
        const normalized = faceErrorFromUnknown(submitError, 'NETWORK_ERROR');
        log.debug('face', 'image upload failed', {
          mode,
          code: normalized.code,
          message: normalized.message,
        });
        setPhase('guide');
        setError(normalized);
      }
    },
    [enrolling, inviteToken, mode, router, t],
  );

  const handleCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
    cameraReadyWaiterRef.current?.();
    cameraReadyWaiterRef.current = null;
  }, []);

  const waitForCameraReady = useCallback(async () => {
    if (!cameraReadyRef.current) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (cameraReadyWaiterRef.current === waiter) cameraReadyWaiterRef.current = null;
          resolve();
        }, FACE_CAPTURE_READY_TIMEOUT_MS);
        const waiter = () => {
          clearTimeout(timeout);
          cameraReadyWaiterRef.current = null;
          resolve();
        };
        cameraReadyWaiterRef.current = waiter;
      });
    }
    await new Promise((resolve) => setTimeout(resolve, FACE_CAPTURE_SETTLE_MS));
  }, []);

  const captureNow = useCallback(async (attempt: number, force = false) => {
    const currentGuide = guideRef.current;
    if (capturingRef.current || attempt !== captureAttemptRef.current) return;
    if (
      !force &&
      (phaseRef.current !== 'countdown' ||
        !currentGuide ||
        currentGuide.state !== 'ready' ||
        currentGuide.faces.length !== 1)
    ) return;
    capturingRef.current = true;
    setCapturing(true);
    let shot: { uri?: string } | undefined;
    try {
      await waitForCameraReady();
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          shot = await cameraRef.current?.takePictureAsync({
            quality: 0.85,
            skipProcessing: false,
            shutterSound: false,
          });
          break;
        } catch (captureError) {
          log.error('face', 'final capture failed', captureError);
          if (retry === 1) throw captureError;
          await new Promise((resolve) => setTimeout(resolve, 350));
          await waitForCameraReady();
        }
      }
      if (!shot?.uri) {
        phaseRef.current = 'guide';
        setPhase('guide');
        setError({
          code: 'CAPTURE_NO_URI',
          message: 'The camera returned no image URI',
        });
        return;
      }

      Vibration.vibrate(60);
      await submit(shot.uri);
    } catch (captureError) {
      log.error('face', 'capture flow failed', captureError);
      phaseRef.current = 'guide';
      setPhase('guide');
      resetGuideRef.current();
      setError(faceErrorFromUnknown(captureError, 'CAPTURE_FAILED'));
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  }, [submit, waitForCameraReady]);

  const handleSheetLayout = useCallback((e: LayoutChangeEvent) => {
    setSheetHeight(e.nativeEvent.layout.height);
  }, []);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || phase !== 'guide') return;
    const timer = setTimeout(() => setManualAvailable(true), FACE_MANUAL_CAPTURE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setManualAvailable(false);
    };
  }, [cameraActive, phase]);

  const captureManually = useCallback(() => {
    captureAttemptRef.current += 1;
    phaseRef.current = 'countdown';
    setPhase('countdown');
    void captureNow(captureAttemptRef.current, true);
  }, [captureNow]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const attempt = captureAttemptRef.current;
    const timer = setTimeout(() => {
      if (attempt !== captureAttemptRef.current || phaseRef.current !== 'countdown') return;
      void captureNow(attempt);
    }, 0);
    return () => clearTimeout(timer);
  }, [phase, captureNow]);

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
                <Text variant="h4" className="text-center">
                  {t('screens.face.permission-title')}
                </Text>
                <Text className="text-foreground-secondary text-center text-sm leading-5">
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
