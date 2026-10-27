import { useEffect } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { forgetLostMicrophone, useMicrophoneStore } from '@/shared/libs/microphone';
import { toast } from '@/shared/libs/toast';

export function useMicrophoneNotice(): void {
  const { t } = useTranslation();
  const lost = useMicrophoneStore((state) => state.lost);

  useEffect(() => {
    if (!lost) return;
    toast.info(t('common.microphone.lost', { name: lost.label || t('common.microphone.title') }));
    forgetLostMicrophone();
  }, [lost, t]);
}
