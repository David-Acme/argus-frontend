import { router } from 'expo-router';
import { useEffect } from 'react';
import { moduleEngine } from '@/core/services/modules';
import { t } from '@/core/i18n';
import { MODULE_SETTINGS_PATH } from '@/shared/constants';
import { toast } from '@/shared/libs/toast';
import { failureKey } from '@/features/modules/model/module-text';

export function ModuleNotices() {
  useEffect(
    () =>
      moduleEngine.onTransition((transition) => {
        if (transition.state === 'done') {
          toast.success(t('screens.modules.done-toast', { name: transition.name }), t('screens.modules.done-toast-hint'));
          return;
        }
        toast.error(t('screens.modules.failed-toast', { name: transition.name }), t(failureKey(transition.reason)), {
          label: t('screens.modules.actions.retry'),
          onPress: () => router.push(MODULE_SETTINGS_PATH),
        });
      }),
    []
  );
  return null;
}
