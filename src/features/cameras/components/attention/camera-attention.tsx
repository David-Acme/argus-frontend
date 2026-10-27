import { useEffect } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { AttentionProbeProps } from '@/shared/libs/surfaces';
import { cameraAttention } from '@/features/cameras/model/camera-attention';

export function CameraAttention({ report }: AttentionProbeProps) {
  const { t } = useTranslation();
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  useEffect(() => {
    report(cameraAttention(cameras, t));
  }, [cameras, report, t]);
  return null;
}
