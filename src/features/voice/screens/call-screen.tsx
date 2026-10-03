import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAuthStore } from '@/core/stores';
import { CallSurface } from '@/features/voice/components/call-surface';
import { VoiceWebNotice } from '@/features/voice/components/voice-web-notice';
import { IS_NATIVE } from '@/shared/constants';
import { useCall } from '@/features/voice/hooks/use-call';

function CallScreen() {
  const router = useRouter();
  const call = useCall();
  const hangUp = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  return (
    <CallSurface
      phase={call.phase}
      muted={call.muted}
      error={call.error}
      transcript={call.transcript}
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
