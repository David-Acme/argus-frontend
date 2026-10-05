import { useEffect, useRef, useState } from 'react';
import { visitorService } from '@/features/visitors/services/visitor.service';

export type VisitorCropInput = {
  visitorId: number;
  sampleId?: number | null;
  enabled: boolean;
};

type CropState = {
  key: string;
  uri: string | null;
  failed: boolean;
};

export function useVisitorCrop({ visitorId, sampleId, enabled }: VisitorCropInput) {
  const key = `${visitorId}:${sampleId ?? 0}`;
  const [state, setState] = useState<CropState>({ key: '', uri: null, failed: false });
  const request = useRef(0);

  useEffect(() => {
    request.current += 1;
    const current = request.current;
    if (enabled)
      void visitorService.crop(visitorId, sampleId ?? undefined).then((answer) => {
        if (current !== request.current) return;
        setState({
          key,
          uri: answer.ok && answer.info ? `data:${answer.info.mimeType};base64,${answer.info.base64}` : null,
          failed: !answer.ok,
        });
      });
    return () => {
      request.current += 1;
    };
  }, [enabled, key, sampleId, visitorId]);

  const fresh = enabled && state.key === key;
  return { uri: fresh ? state.uri : null, failed: fresh && state.failed };
}
