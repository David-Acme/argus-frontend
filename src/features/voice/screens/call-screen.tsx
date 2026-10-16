import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { ResponseCard } from '@/features/response';
import { CallCameraCard } from '@/features/voice/components/call-camera-card';
import { CallSurface } from '@/features/voice/components/call-surface';
import { VoiceWebNotice } from '@/features/voice/components/voice-web-notice';
import { argusCallSupported, voiceService } from '@/features/voice/services/voice';
import { storageService } from '@/core/services/storage';
import { CAPABILITY, VIEW_CACHE_KEYS, VOICE_MIC_CONSENT_KEY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCall } from '@/features/voice/hooks/use-call';
import { CALL_ROUTE_WAIT_MS, callRouteDecision } from '@/features/voice/model/call-route';
import { ENDED_HOLD_MS } from '@/features/voice/model/call-end';
import { leaveCall } from '@/features/voice/model/leave-call';

function CallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ callId?: string }>();
  const call = useCall(params.callId ? { callId: params.callId } : {});
  const [firstCall] = useState(() => storageService.getBoolean(VOICE_MIC_CONSENT_KEY) !== true);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const liveCamera = cameras.find((camera) => camera.id === call.liveCameraId) ?? null;
  const startedAt = useRef<number | null>(null);
  const [endedDurationMs, setEndedDurationMs] = useState<number | null>(null);
  const leave = useCallback(
    () =>
      leaveCall({
        stopVoice: () => voiceService.stop(),
        canGoBack: () => router.canGoBack(),
        goBack: () => router.back(),
      }),
    [router],
  );
  const hangUp = useCallback(() => {
    if (endedDurationMs !== null) return;
    voiceService.stop();
    setEndedDurationMs(startedAt.current === null ? 0 : Date.now() - startedAt.current);
  }, [endedDurationMs]);
  const closeCamera = useCallback(() => voiceService.showCamera(null), []);
  const answerWaiting = useCallback(() => voiceService.answerWaiting(), []);
  const dismissWaiting = useCallback(() => voiceService.dismissWaiting(), []);
  const openCamera = useCallback(() => {
    if (!liveCamera) return;
    voiceService.showCamera(null);
    router.push(`/cameras/${liveCamera.id}`);
  }, [liveCamera, router]);

  useEffect(() => {
    if (firstCall) storageService.set(VOICE_MIC_CONSENT_KEY, true);
  }, [firstCall]);

  useEffect(() => {
    if (startedAt.current !== null) return;
    if (call.phase === 'listening' || call.phase === 'thinking' || call.phase === 'speaking') startedAt.current = Date.now();
  }, [call.phase]);

  useEffect(() => {
    if (call.closedCallId !== null && call.closedCallId === params.callId) hangUp();
  }, [call.closedCallId, hangUp, params.callId]);

  useEffect(() => {
    if (endedDurationMs === null) return;
    const timer = setTimeout(leave, ENDED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [endedDurationMs, leave]);

  return (
    <CallSurface
      phase={call.phase}
      muted={call.muted}
      error={call.error}
      transcript={call.transcript}
      actions={call.actions}
      reason={call.callReason}
      situation={call.responseId ? <ResponseCard responseId={call.responseId} compact /> : null}
      waitingReason={call.waitingCall?.reason ?? null}
      onAnswerWaiting={answerWaiting}
      onDismissWaiting={dismissWaiting}
      notice={firstCall ? t('screens.voice.mic-consent') : null}
      camera={
        liveCamera ? (
          <CallCameraCard
            cameraId={liveCamera.id}
            name={liveCamera.name}
            view={call.liveCameraView}
            onClose={closeCamera}
            onOpen={openCamera}
          />
        ) : null
      }
      onToggleMute={call.toggleMute}
      onHangUp={hangUp}
      onRetry={call.retry}
      endedDurationMs={endedDurationMs}
    />
  );
}

function CallLoading() {
  const noop = useCallback(() => {}, []);
  return (
    <CallSurface
      phase="connecting"
      muted={false}
      error={null}
      transcript={[]}
      onToggleMute={noop}
      onHangUp={noop}
      onRetry={noop}
    />
  );
}

export default function CallRoute() {
  const authStatus = useAuthStore((state) => state.status);
  const params = useLocalSearchParams<{ callId?: string }>();
  const { has, ready } = useCapabilities();
  const [waitedOut, setWaitedOut] = useState(false);
  const allowed = has(params.callId ? CAPABILITY.callsJoin : CAPABILITY.assistantVoice);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setWaitedOut(true), CALL_ROUTE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const decision = callRouteDecision({ signedIn: authStatus === 'signed-in', ready, waitedOut, allowed });
  if (decision === 'redirect') return <Redirect href="/" />;
  if (decision === 'wait') return <CallLoading />;
  return argusCallSupported() ? <CallScreen /> : <VoiceWebNotice />;
}
