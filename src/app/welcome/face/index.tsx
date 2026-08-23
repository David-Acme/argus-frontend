import { authService } from '@/core/services/auth.service';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { FaceGuideOverlay } from '@/shared/components/face/face-guide-overlay';
import { useFaceGuide } from '@/shared/hooks/use-face-guide';
import {
  FACE_CAPTURE_READY_TIMEOUT_MS,
  FACE_CAPTURE_SETTLE_MS,
  IS_ANDROID,
  IS_NATIVE,
} from '@/shared/constants';
import type { IApiError } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
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

/** Estimated bottom-sheet height before the first onLayout measurement. */
const SHEET_ESTIMATE = 260;

function WebOnlyNotice({ mode }: { mode: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const enrolling = mode !== 'login';

  return (
    <View
      className="bg-background flex-1 w-full max-w-md self-center items-center justify-center gap-6 px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="bg-accent-soft size-16 items-center justify-center rounded-full">
        <Icon name="scan-face" className="text-accent size-8" />
      </View>
      <View className="items-center gap-2">
        <Text variant="h3" className="text-center">
          {t('screens.face.web-only-title')}
        </Text>
        <Text className="text-foreground-secondary text-center text-sm leading-5">
          {t(enrolling ? 'screens.face.web-only-enroll' : 'screens.face.web-only-login')}
        </Text>
      </View>
      {enrolling ? (
        <Button variant="outline" size="lg" onPress={() => router.replace('/welcome')}>
          <Icon name="arrow-left" />
          <Text>{t('common.back')}</Text>
        </Button>
      ) : (
        <Button variant="outline" size="lg" onPress={() => router.replace('/login')}>
          <Icon name="monitor" />
          <Text>{t('screens.login.title')}</Text>
        </Button>
      )}
    </View>
  );
}

type Phase = 'guide' | 'countdown' | 'submitting';
type FaceError = IApiError & { status?: number };

/** Keep diagnostic details in development without triggering the app-wide no-console rule. */
function reportFaceError(message: string, details?: unknown): void {
  if (!__DEV__) return;
  globalThis.console?.error(message, details);
}

function errorFromUnknown(error: unknown, fallbackCode: string): FaceError {
  if (error && typeof error === 'object') {
    const value = error as { code?: unknown; message?: unknown; status?: unknown };
    return {
      code: typeof value.code === 'string' ? value.code : fallbackCode,
      message: typeof value.message === 'string' ? value.message : String(error),
      ...(typeof value.status === 'number' ? { status: value.status } : {}),
    };
  }
  return { code: fallbackCode, message: String(error) };
}

function getFaceErrorMessage(error: FaceError, t: TranslateFn): string {
  const detail = [
    error.message,
    ...Object.values(error.fields ?? {}).flat(),
  ]
    .join(' ')
    .toLowerCase();
  if (error.code === 'CAPTURE_FAILED' || error.code === 'CAPTURE_NO_URI') {
    return t('screens.face.error-camera-capture');
  }
  if (
    error.code === 'VALIDATION_ERROR' &&
    (detail.includes('exceed') || detail.includes('10mb') || detail.includes('empty'))
  ) {
    return detail.includes('empty')
      ? t('screens.face.error-empty-image')
      : t('screens.face.error-image-too-large');
  }
  if (detail.includes('face not detected')) return t('screens.face.error-face-not-detected');
  if (error.code === 'UNAUTHORIZED' || detail.includes('face not recognized')) {
    return t('screens.face.error-face-not-recognized');
  }
  if (error.code === 'NETWORK_ERROR' || error.code === 'PAIRING_REQUIRED') {
    return t('screens.face.error-network');
  }
  return error.message || t('screens.face.error');
}

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

  const granted = permission?.granted === true;
  const denied = permission !== null && !permission.granted && !permission.canAskAgain;

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
    // CameraView is unmounted while the image is uploaded. Do not let the
    // readiness flag from the previous native view leak into a retry.
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
        const enrolling = mode === 'owner-enroll' || mode === 'invite-enroll';
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
        reportFaceError('[face] backend rejected captured image', {
          mode,
          status: response.status,
          code: apiError.code,
          message: apiError.message,
          fields: apiError.fields,
        });
        setPhase('guide');
        setError({ ...apiError, status: response.status });
      } catch (submitError) {
        const normalized = errorFromUnknown(submitError, 'NETWORK_ERROR');
        reportFaceError('[face] image upload failed', {
          mode,
          code: normalized.code,
          message: normalized.message,
        });
        setPhase('guide');
        setError(normalized);
      }
    },
    [inviteToken, mode, router, t],
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

  const captureNow = useCallback(async (attempt: number) => {
    const currentGuide = guideRef.current;
    if (
      capturingRef.current ||
      attempt !== captureAttemptRef.current ||
      phaseRef.current !== 'countdown' ||
      !currentGuide ||
      currentGuide.state !== 'ready' ||
      currentGuide.faces.length !== 1
    ) return;
    capturingRef.current = true;
    setCapturing(true);
    let shot: { uri?: string } | undefined;
    try {
      await waitForCameraReady();
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          shot = await cameraRef.current?.takePictureAsync({
            // The backend rejects files over 10 MB.  0.85 keeps enough detail
            // for the embedding while avoiding full-resolution JPEG spikes.
            quality: 0.85,
            skipProcessing: false,
            shutterSound: false,
          });
          break;
        } catch (captureError) {
          reportFaceError('[face] final capture failed', captureError);
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
      reportFaceError('[face] capture flow failed', captureError);
      phaseRef.current = 'guide';
      setPhase('guide');
      resetGuideRef.current();
      setError(errorFromUnknown(captureError, 'CAPTURE_FAILED'));
    } finally {
      capturingRef.current = false;
      setCapturing(false);
    }
  }, [submit, waitForCameraReady]);

  const handleSheetLayout = useCallback((e: LayoutChangeEvent) => {
    setSheetHeight(e.nativeEvent.layout.height);
  }, []);

  // Cleanup the "already registered" redirect on unmount (the previous version
  // returned the cleanup from an async callback, where it was discarded).
  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  // Auto-request the camera permission once the system answers.
  useEffect(() => {
    if (permission === null || permission.granted || !permission.canAskAgain) return;
    void requestPermission();
  }, [permission, requestPermission]);

  // Capture as soon as the detector marks the face ready.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const attempt = captureAttemptRef.current;
    const timer = setTimeout(() => {
      if (attempt !== captureAttemptRef.current || phaseRef.current !== 'countdown') return;
      void captureNow(attempt);
    }, 0);
    return () => clearTimeout(timer);
  }, [phase, captureNow]);

  // The guide area is the camera region between the top inset and the bottom
  // sheet (measured, never guessed) — the oval lives inside it, so the sheet
  // can never cover the face frame on any screen size.
  const sheetTop = height - (sheetHeight > 0 ? sheetHeight : SHEET_ESTIMATE);
  const cameraArea = { top: insets.top, height: Math.max(sheetTop - insets.top, 120) };

  if (!IS_NATIVE) return <WebOnlyNotice mode={mode} />;

  const sending = phase === 'submitting' || (phase === 'countdown' && capturing);
  const titleKey = sending
    ? mode === 'owner-enroll' || mode === 'invite-enroll'
      ? 'screens.face.enrolling'
      : 'screens.face.logging'
    : phase === 'countdown'
      ? 'screens.face.hold-still'
      : 'screens.face.position-face';
  const hintKey = sending ? null : 'screens.face.position-hint';
  const friendlyError = error ? getFaceErrorMessage(error, t) : null;

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
          // Keep the native analyzer mounted while the still image is taken.
          // Toggling this prop at the same time as takePictureAsync makes
          // CameraX recreate its use cases and races ImageCapture.
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

      {/*
        The sheet is a fixed skeleton across phases (title, hint, message slot,
        action slot) so its height — and therefore the camera area the oval is
        fitted to — does not jump when the phase changes.
      */}
      <View
        className="bg-card/95 w-full max-w-md self-center rounded-t-2xl px-5 py-6"
        style={{ paddingBottom: insets.bottom + 24 }}
        onLayout={handleSheetLayout}>
        <View className="gap-3">
          <Text variant="h4" numberOfLines={1} maxFontSizeMultiplier={1.25}>
            {t(titleKey)}
          </Text>
          {hintKey ? (
            <Text
              className="text-foreground-secondary text-sm leading-5"
              numberOfLines={2}
              maxFontSizeMultiplier={1.25}>
              {t(hintKey)}
            </Text>
          ) : null}

          {/* Reserved message slot: keeps the sheet height stable across phases. */}
          <View className="min-h-6 justify-center">
            {error ? (
              <View className="flex-row items-center gap-2.5">
                <Icon name="triangle-alert" className="text-error size-5" />
                <View className="flex-1 gap-0.5">
                  <Text
                    className="text-error text-sm leading-5"
                    maxFontSizeMultiplier={1.25}>
                    {friendlyError}
                  </Text>
                  <Text
                    className="text-error/70 text-[11px] leading-4"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}>
                    {error.code}
                  </Text>
                  {__DEV__ && error.message && error.message !== friendlyError ? (
                    <Text
                      className="text-error/70 text-[11px] leading-4"
                      numberOfLines={2}
                      maxFontSizeMultiplier={1.15}>
                      {error.message}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : notice ? (
              <View className="flex-row items-center gap-2.5">
                <Icon name="check-circle" className="text-success size-5" />
                <Text
                  className="text-success flex-1 text-sm leading-5"
                  maxFontSizeMultiplier={1.25}>
                  {notice}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Fixed-height action slot: automatic capture | sending. */}
          <View className="h-11 justify-center">
            {phase === 'submitting' ? (
              <View className="flex-row items-center justify-center gap-3">
                <Icon name="refresh-cw" className="text-accent size-5" />
                <Text maxFontSizeMultiplier={1.25}>{t('screens.face.sending')}</Text>
              </View>
            ) : (
              <Text
                className="text-foreground-secondary text-center text-sm"
                maxFontSizeMultiplier={1.25}>
                {t('screens.face.auto-capture')}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
