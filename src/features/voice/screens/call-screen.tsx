import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { CallCameraCard } from '@/features/voice/components/call-camera-card';
import { CallSurface } from '@/features/voice/components/call-surface';
import { VoiceWebNotice } from '@/features/voice/components/voice-web-notice';
import { argusCallSupported, voiceService } from '@/features/voice/services/voice';
import { storageService } from '@/core/services/storage';
import { VIEW_CACHE_KEYS, VOICE_MIC_CONSENT_KEY } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCall } from '@/features/voice/hooks/use-call';

function CallScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ callId?: string }>();
  const call = useCall(params.callId ? { callId: params.callId } : {});
  const [firstCall] = useState(() => storageService.getBoolean(VOICE_MIC_CONSENT_KEY) !== true);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const liveCamera = cameras.find((camera) => camera.id === call.liveCameraId) ?? null;
  const hangUp = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
  const closeCamera = useCallback(() => voiceService.showCamera(null), []);
  const openCamera = useCallback(() => {
    if (!liveCamera) return;
    voiceService.showCamera(null);
    router.push(`/cameras/${liveCamera.id}`);
  }, [liveCamera, router]);

  useEffect(() => {
    if (firstCall) storageService.set(VOICE_MIC_CONSENT_KEY, true);
  }, [firstCall]);

  return (
    <CallSurface
      phase={call.phase}
      muted={call.muted}
      error={call.error}
      transcript={call.transcript}
      actions={call.actions}
      reason={call.callReason}
      notice={firstCall ? t('screens.voice.mic-consent') : null}
      camera={
        liveCamera ? (
          <CallCameraCard
            cameraId={liveCamera.id}
            name={liveCamera.name}
            onClose={closeCamera}
            onOpen={openCamera}
          />
        ) : null
      }
      onToggleMute={call.toggleMute}
      onInterrupt={call.interrupt}
      onHangUp={hangUp}
      onRetry={call.retry}
    />
  );
}

export default function CallRoute() {
  const authStatus = useAuthStore((state) => state.status);
  if (authStatus !== 'signed-in') return <Redirect href="/" />;
  return argusCallSupported() ? <CallScreen /> : <VoiceWebNotice />;
}
