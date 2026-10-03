import { useCallback, useRef, useState } from 'react';
import { t } from '@/core/i18n';
import { toastServiceError } from '@/shared/libs/service-error';
import { toast } from '@/shared/libs/toast';
import { portraitDataUri } from '@/features/people/model/portrait-preview';
import { portraitPreviewService } from '@/features/people/services/portrait-preview.service';

type PortraitVerification = {
  uri: string | null;
  loading: boolean;
  verify: (userId: string) => Promise<void>;
  reset: () => void;
};

export function usePortraitVerification(): PortraitVerification {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  const reset = useCallback(() => {
    request.current += 1;
    setUri(null);
    setLoading(false);
  }, []);

  const verify = useCallback(async (userId: string) => {
    request.current += 1;
    const current = request.current;
    setLoading(true);
    setUri(null);
    const capability = await portraitPreviewService.createCapability(Number(userId));
    if (current !== request.current) return;
    if (!capability.ok || !capability.info) {
      setLoading(false);
      toastServiceError(capability.errors);
      return;
    }
    const portrait = await portraitPreviewService.consume(capability.info.token);
    if (current !== request.current) return;
    setLoading(false);
    if (!portrait.ok || !portrait.info) {
      toastServiceError(portrait.errors);
      return;
    }
    const dataUri = portraitDataUri(portrait.info);
    if (!dataUri) {
      toast.error(t('common.errors.unknown'));
      return;
    }
    setUri(dataUri);
  }, []);

  return { uri, loading, verify, reset };
}
