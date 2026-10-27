import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { traceEvent } from '@/core/services/native-trace';
import { pushService } from '@/core/services/push';
import { storageService } from '@/core/services/storage';
import { useAuthStore, usePendingCallStore } from '@/core/stores';
import {
  ASSISTANT_THREAD_HREF,
  CAPABILITY,
  VIEW_CACHE_KEYS,
  VOICE_MIC_CONSENT_KEY,
} from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ResponseCard } from '@/features/response';
import { CallSurface } from '@/features/voice/components/call-surface';
import { CallResults } from '@/features/voice/components/results/call-results';
import { VoiceWebNotice } from '@/features/voice/components/voice-web-notice';
import { useCall } from '@/features/voice/hooks/use-call';
import { dispatchCallEnd, ENDED_HOLD_MS, showsMicConsent } from '@/features/voice/model/call-end';
import { setCallLock } from '@/features/voice/model/call-lock';
import { outsideCallLockId } from '@/features/voice/model/call-lock-state';
import {
  CALL_ROUTE_WAIT_MS,
  callRouteDecision,
  callRouteHref,
  callRouteTraceReason,
} from '@/features/voice/model/call-route';
import {
  endedSummaryOf,
  formatCallClock,
  postsSummaryNotice,
  summaryBodyOf,
} from '@/features/voice/model/call-stage';
import { callKindOf } from '@/features/voice/model/incoming-surface';
import { leaveCall } from '@/features/voice/model/leave-call';
import { voiceActionLabel } from '@/features/voice/model/voice-action-label';
import { argusCallSupported, voiceService } from '@/features/voice/services/voice';

function CallScreen() {
  const router = useRouter();
  const { t, tk } = useTranslation();
  const params = useLocalSearchParams<{ callId?: string; outside?: string }>();
  const enteredFromOutside = params.outside === '1';
  useEffect(() => {
    if (!enteredFromOutside || !params.callId) return;
    setCallLock(params.callId);
    return () => setCallLock(null);
  }, [enteredFromOutside, params.callId]);
  const call = useCall(params.callId ? { callId: params.callId } : {});
  const [firstCall] = useState(() => storageService.getBoolean(VOICE_MIC_CONSENT_KEY) !== true);
  const [startedAt] = useState(() => Date.now());
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const liveCamera = cameras.find((camera) => camera.id === call.liveCameraId) ?? null;
  const [endedDurationMs, setEndedDurationMs] = useState<number | null>(null);
  const leave = useCallback(
    () =>
      leaveCall({
        stopVoice: () => voiceService.stop(),
        canGoBack: () => router.canGoBack(),
        goBack: () => {
          traceEvent('route', 'left', 'back');
          router.back();
        },
        sendToBackground: () => {
          traceEvent('route', 'left', 'background');
          pushService.sendToBackground();
        },
        enteredFromOutside,
      }),
    [router, enteredFromOutside]
  );
  const hangUp = useCallback(() => {
    if (endedDurationMs !== null) return;
    voiceService.stop();
    const durationMs = call.connectedAt === null ? 0 : Date.now() - call.connectedAt;
    traceEvent('route', 'ended', `outside-${enteredFromOutside ? 1 : 0}-hold-${ENDED_HOLD_MS}`);
    setEndedDurationMs(durationMs);
    if (
      !postsSummaryNotice({
        appActive: AppState.currentState === 'active',
        locked: pushService.isKeyguardLocked(),
      })
    )
      return;
    const labels = endedSummaryOf(call.actions).map((action) =>
      voiceActionLabel(action, { t, tk })
    );
    pushService.postCallSummary(
      t('screens.voice.stage.ended-line', { time: formatCallClock(durationMs) }),
      summaryBodyOf(labels, t('screens.voice.stage.summary-empty'))
    );
  }, [endedDurationMs, enteredFromOutside, call.connectedAt, call.actions, t, tk]);
  const { has } = useCapabilities();
  const chatAllowed = has(CAPABILITY.messagesRelay) && !params.callId && !enteredFromOutside;
  const switchToChat = useCallback(() => {
    voiceService.stop();
    traceEvent('route', 'left', 'to-chat');
    if (router.canDismiss()) router.dismissTo(ASSISTANT_THREAD_HREF);
    else router.replace(ASSISTANT_THREAD_HREF);
  }, [router]);
  const answerWaiting = useCallback(() => voiceService.answerWaiting(), []);
  const dismissWaiting = useCallback(() => voiceService.dismissWaiting(), []);
  const viewCamera = useCallback(() => {
    void pushService.requestUnlock().then((unlocked) => {
      traceEvent(
        'lock',
        unlocked ? 'ok' : 'stay',
        unlocked ? 'camera-unlocked' : 'camera-still-locked'
      );
      if (!unlocked) return;
      voiceService.showCamera(null);
      router.push(liveCamera ? `/cameras/${liveCamera.id}` : '/cameras');
    });
  }, [liveCamera, router]);
  const minimise = useCallback(() => {
    traceEvent('route', 'left', 'minimised');
    router.push('/');
  }, [router]);

  useEffect(() => {
    if (firstCall) storageService.set(VOICE_MIC_CONSENT_KEY, true);
  }, [firstCall]);

  useEffect(() => {
    if (
      call.closedCallId === null ||
      call.closedCallId !== params.callId ||
      call.closedReason === null
    )
      return;
    dispatchCallEnd(call.closedReason, { showEnded: hangUp, closeNow: leave });
  }, [call.closedCallId, call.closedReason, hangUp, leave, params.callId]);

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
      kind={callKindOf(call.callUrgency ?? undefined)}
      connectedAt={call.connectedAt}
      reason={call.callReason}
      situation={call.responseId ? <ResponseCard responseId={call.responseId} compact /> : null}
      results={<CallResults since={startedAt} />}
      waitingReason={call.waitingCall?.reason ?? null}
      onAnswerWaiting={answerWaiting}
      onDismissWaiting={dismissWaiting}
      notice={
        showsMicConsent({ firstCall, phase: call.phase, endedDurationMs })
          ? t('screens.voice.mic-consent')
          : null
      }
      onViewCamera={has(CAPABILITY.cameraView) ? viewCamera : undefined}
      onMinimise={enteredFromOutside ? undefined : minimise}
      onClose={leave}
      onToggleMute={call.toggleMute}
      onHangUp={hangUp}
      onRetry={call.retry}
      onSwitchToChat={chatAllowed ? switchToChat : undefined}
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
  const params = useLocalSearchParams<{ callId?: string; outside?: string }>();
  const { has, ready } = useCapabilities();
  const [waitedOut, setWaitedOut] = useState(false);
  const allowed = has(params.callId ? CAPABILITY.callsJoin : CAPABILITY.assistantVoice);
  const { callId, outside } = params;

  useEffect(() => {
    if (authStatus === 'signed-in' || !callId) return;
    usePendingCallStore
      .getState()
      .hold(callRouteHref({ callId, outside: outside === '1' }), Date.now());
  }, [authStatus, callId, outside]);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setWaitedOut(true), CALL_ROUTE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const signedIn = authStatus === 'signed-in';
  const decision = callRouteDecision({ signedIn, ready, waitedOut, allowed });
  const traceReason = callRouteTraceReason({
    signedIn,
    allowed,
    ready,
    waitedOut,
    outside: params.outside === '1',
    locked: outsideCallLockId() !== null,
  });
  useEffect(() => {
    traceEvent('route', decision === 'redirect' ? 'redirect' : 'stay', traceReason);
  }, [decision, traceReason]);
  if (decision === 'redirect') return <Redirect href="/" />;
  if (decision === 'wait') return <CallLoading />;
  return argusCallSupported() ? <CallScreen /> : <VoiceWebNotice />;
}
