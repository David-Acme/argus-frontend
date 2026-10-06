import { router } from 'expo-router';
import { useEffect } from 'react';
import { moduleEngine } from '@/core/services/modules';
import { t } from '@/core/i18n';
import { MODULE_SETTINGS_PATH } from '@/shared/constants';
import { toast } from '@/shared/libs/toast';
import { failureText, jobLabelKey } from '@/features/modules/model/module-text';

export function ModuleNotices() {
  useEffect(
    () =>
      moduleEngine.onTransition((transition) => {
        if (transition.state === 'done') {
          if (transition.kind === 'install') {
            toast.success(t('screens.modules.done-toast', { name: transition.name }), t('screens.modules.done-toast-hint'));
          } else {
            toast.success(t(jobLabelKey(transition)), transition.name);
          }
          return;
        }
        const title =
          transition.kind === 'install'
            ? t('screens.modules.failed-toast', { name: transition.name })
            : `${t(jobLabelKey(transition))} · ${transition.name}`;
        toast.error(title, [failureText(transition.reason, transition.owner, t), transition.note].filter(Boolean).join(' '), {
          label: t('screens.modules.actions.retry'),
          onPress: () => router.push(MODULE_SETTINGS_PATH),
        });
      }),
    []
  );
  return null;
}
