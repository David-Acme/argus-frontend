import { useCallback } from 'react';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { VoiceprintDirectory } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { erasureSummary, withoutVoice } from '@/features/people/model/biometric-erase';
import { userManagementService } from '@/features/people/services/user-management.service';

export type BiometricEraseInput = {
  userId: number;
  name: string;
};

export function useBiometricErase() {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();

  const erase = useCallback(
    async ({ userId, name }: BiometricEraseInput) => {
      const result = await run({
        confirm: {
          title: t('screens.users.biometrics.confirm-title', { name }),
          description: t('screens.users.biometrics.confirm-description', { name }),
          confirmLabel: t('screens.users.biometrics.erase'),
          intent: 'danger',
        },
        call: () => userManagementService.eraseBiometrics(userId),
        errorTitle: t('screens.users.biometrics.error'),
      });
      if (!result?.info) return false;
      const directory = viewCacheService.readValue<VoiceprintDirectory>(VIEW_CACHE_KEYS.voiceprintUsers);
      if (directory) viewCacheService.writeValue(VIEW_CACHE_KEYS.voiceprintUsers, withoutVoice(directory, userId));
      const summary = erasureSummary(result.info);
      toast.success(
        t('screens.users.biometrics.erased', { name }),
        summary.kind === 'nothing'
          ? t('screens.users.biometrics.erased-nothing')
          : t('screens.users.biometrics.erased-counts', {
              faces: summary.faces,
              portraits: summary.portraits,
              samples: summary.samples,
            }),
      );
      return true;
    },
    [run, t],
  );

  return { erase, pending };
}
