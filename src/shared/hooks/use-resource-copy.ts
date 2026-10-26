import type { ResourceCopy } from '@/shared/ui/resource-view';
import { useTranslation } from './use-translation';

export type FailedCopy = { title: string; body?: string };

export function useResourceCopy(failed: FailedCopy): ResourceCopy {
  const { t } = useTranslation();
  return {
    loading: t('common.loading'),
    retry: t('common.retry'),
    failed,
    stale: (age) => t('common.resource.stale', { age }),
    refused: (owner) => t('common.resource.refused', { owner }),
  };
}
