import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useQrScanStore } from '@/core/stores';
import { consentDraft } from '@/features/privacy';
import { FaceEnrollView } from '@/features/auth/components/face-enroll-view';
import { FaceLoginView } from '@/features/auth/components/face-login-view';
import { useFaceCapture } from '@/features/auth/hooks/use-face-capture';
import { flowOf } from '@/features/auth/model/onboarding-flow';

export default function FaceScreen() {
  const router = useRouter();
  const { mode = 'owner-enroll', restore } = useLocalSearchParams<{
    mode?: string;
    restore?: string;
  }>();
  const capture = useFaceCapture({ mode });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/welcome'));

  useEffect(() => {
    useQrScanStore.getState().clear();
    return () => useQrScanStore.getState().clear();
  }, []);

  if (!capture.enrolling) return <FaceLoginView capture={capture} restoring={restore === '1'} />;
  if (!consentDraft.peek() && capture.phase !== 'submitting' && !capture.done)
    return <Redirect href={{ pathname: '/welcome/privacy', params: { mode } }} />;
  return (
    <FaceEnrollView
      capture={capture}
      place={{ flow: flowOf({ mode }), step: 'face' }}
      onBack={back}
    />
  );
}
