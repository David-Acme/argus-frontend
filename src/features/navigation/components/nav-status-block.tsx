import { useCameraCounts } from '@/features/cameras';
import { useGuardHeadline } from '@/features/security';
import { MODE_NAME_KEYS, navStatusRows } from '@/features/navigation/model/nav-status-rows';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { NavStatus } from '@/shared/ui/nav';

type NavStatusBlockProps = { onAsk: () => void };

export function NavStatusBlock({ onAsk }: NavStatusBlockProps) {
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const mode = useGuardHeadline();
  const cameras = useCameraCounts();
  const rows = navStatusRows({
    mode,
    cameras: has(CAPABILITY.cameraView) ? cameras : null,
    copy: {
      mode: t('screens.navigation.mode'),
      modeName: (name) => t(MODE_NAME_KEYS[name]),
      cameras: ({ online, total }) =>
        t('screens.navigation.cameras', { online: String(online), total: String(total) }),
      camerasActive: t('screens.navigation.cameras-active'),
    },
  });
  return (
    <NavStatus
      title={t('screens.navigation.status-title')}
      rows={rows}
      ask={{ label: t('screens.navigation.ask'), onPress: onAsk }}
      presence="idle"
    />
  );
}
