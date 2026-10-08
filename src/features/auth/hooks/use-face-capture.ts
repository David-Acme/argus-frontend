import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { authService } from '@/core/services/auth.service';
import { log } from '@/core/services/log';
import {
  FACE_CAPTURE_READY_TIMEOUT_MS,
  FACE_CAPTURE_SETTLE_MS,
  FACE_MANUAL_CAPTURE_DELAY_MS,
  FACE_STUCK_SUGGESTION_MS,
} from '@/features/auth/constants/face';
import { useFaceGuide } from '@/features/auth/hooks/use-face-guide';
import { faceErrorFromUnknown, type FaceError } from '@/features/auth/model/face-error';
import { clearInviteToken, readInviteToken } from '@/features/auth/model/invite-slot';
import { invitationRevokedBy } from '@/features/auth/model/invitation-refusal';
import { consentDraft } from '@/features/privacy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { submitConsentDraft } from '@/features/auth/model/consent-submit';
import { flowOf, nextHref } from '@/features/auth/model/onboarding-flow';
import { IS_NATIVE } from '@/shared/constants';

type Phase = 'guide' | 'countdown' | 'submitting';

type FaceCaptureOptions = {
  mode: string;
};

export function useFaceCapture({ mode }: FaceCaptureOptions) {
  const router = useRouter();
  const enrolling = mode === 'owner-enroll' || mode === 'invite-enroll';
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
  const [started, setStarted] = useState(!enrolling);
  const [requesting, setRequesting] = useState(false);
  const [asked, setAsked] = useState(false);
  const [manualAvailable, setManualAvailable] = useState(false);
  const [stuck, setStuck] = useState(false);

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
      const inviteToken = mode === 'invite-enroll' ? readInviteToken() : null;
      try {
        const response = enrolling
          ? await authService.register({
              imageUri: uri,
              ...(inviteToken ? { inviteCode: inviteToken } : {}),
            })
          : await authService.login(uri);
        if (response.ok && response.info) {
          clearInviteToken();
          if (enrolling) await submitConsentDraft(t);
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
          const next = enrolling ? nextHref(flowOf({ mode }), 'face', { native: IS_NATIVE }) : null;
          if (next) router.replace(next);
          else router.replace('/');
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
        const revoked = enrolling && inviteToken ? invitationRevokedBy(apiError) : null;
        if (revoked) {
          clearInviteToken();
          consentDraft.take();
          router.replace({ pathname: '/welcome/invitation', params: { revoked: revoked.moduleId ?? 'none' } });
          return;
        }
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
    [enrolling, mode, router, t],
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

  useEffect(() => {
    if (!cameraActive || phase !== 'guide' || notice !== null) return;
    const timer = setTimeout(() => setStuck(true), FACE_STUCK_SUGGESTION_MS);
    return () => {
      clearTimeout(timer);
      setStuck(false);
    };
  }, [cameraActive, phase, notice]);

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

  return {
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
    stuck,
    guide,
    cameraActive,
    handleCameraReady,
    captureManually,
  };
}
