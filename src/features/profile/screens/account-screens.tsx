import { useTranslation } from '@/shared/hooks/use-translation';
import { ModuleRequestsSection } from '@/features/modules';
import { ProximitySection } from '@/features/proximity';
import { SafetySection } from '@/features/safety';
import { CallPreferencesSection } from '@/features/voice';
import { SubScreen } from '@/features/profile/components/sub-screen';

export function CallsScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen
      title={t('screens.profile.links.calls.title')}
      meta={t('screens.profile.links.calls.meta')}>
      <CallPreferencesSection />
    </SubScreen>
  );
}

export function SafetyScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('screens.profile.links.safety.title')}>
      <SafetySection />
    </SubScreen>
  );
}

export function ProximityScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('screens.profile.links.proximity.title')}>
      <ProximitySection />
    </SubScreen>
  );
}

export function ModuleRequestsScreen() {
  const { t } = useTranslation();
  return (
    <SubScreen title={t('screens.profile.links.modules.title')}>
      <ModuleRequestsSection />
    </SubScreen>
  );
}
