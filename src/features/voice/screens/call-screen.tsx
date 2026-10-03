import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { CallCameraCard } from '@/features/voice/components/call-camera-card';
import { CallSurface } from '@/features/voice/components/call-surface';
import { VoiceWebNotice } from '@/features/voice/components/voice-web-notice';
import { voiceService } from '@/features/voice/services/voice';
import { IS_NATIVE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCall } from '@/features/voice/hooks/use-call';

function CallScreen() {
  const router = useRouter();
  const call = useCall();
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

  return (
    <CallSurface
      phase={call.phase}
      muted={call.muted}
      error={call.error}
      transcript={call.transcript}
      actions={call.actions}
      camera={
        liveCamera ? (
          <CallCameraCard cameraId={liveCamera.id} name={liveCamera.name} onClose={closeCamera} onOpen={openCamera} />
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
  return IS_NATIVE ? <CallScreen /> : <VoiceWebNotice />;
}
