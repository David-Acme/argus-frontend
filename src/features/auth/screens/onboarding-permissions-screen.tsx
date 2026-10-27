import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import type { DevicePermission } from '@/core/types';
import { useDevicePermissions } from '@/shared/hooks/use-device-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { PERMISSION_COPY } from '@/features/auth/constants/permissions.constant';
import { flowOf } from '@/features/auth/model/onboarding-flow';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

type PermissionRowProps = { permission: DevicePermission; first: boolean; onAllow: () => void };

function PermissionRow({ permission, first, onAllow }: PermissionRowProps) {
  const { t } = useTranslation();
  const { id, granted } = permission;
  const copy = PERMISSION_COPY[id];
  return (
    <Row
      title={t(copy.title)}
      meta={t(copy.meta)}
      leading={<Avatar icon={copy.glyph} tone={granted ? 'ok' : 'default'} />}
      trailing={
        granted ? (
          <Chip tone="ok" icon="check" label={t('screens.welcome.permissions.granted')} />
        ) : (
          <Button
            compact
            variant={first ? 'primary' : 'secondary'}
            label={t('common.permissions.allow')}
            onPress={onAllow}
          />
        )
      }
    />
  );
}

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { next } = useOnboardingNext();
  const flow = flowOf(useLocalSearchParams<{ flow?: string; mode?: string }>());
  const { permissions, request, requestRuntime } = useDevicePermissions('onboarding');
  const firstMissing = permissions.find((permission) => !permission.granted)?.id;
  const goOn = () => router.replace(next(flow, 'permissions'));
  const allowAndGoOn = async () => {
    await requestRuntime();
    goOn();
  };

  return (
    <OnboardingFrame
      top={<OnboardingTop />}
      footer={
        <>
          <Button
            variant="primary"
            block
            label={t('screens.welcome.permissions.continue')}
            onPress={allowAndGoOn}
          />
          <Button
            variant="ghost"
            block
            label={t('screens.welcome.permissions.later')}
            onPress={goOn}
          />
        </>
      }>
      <OnboardingHeading
        title={t('screens.welcome.permissions.title')}
        lead={t('screens.welcome.permissions.lead')}
      />
      <Section>
        {permissions.map((permission) => (
          <PermissionRow
            key={permission.id}
            permission={permission}
            first={permission.id === firstMissing}
            onAllow={() => request(permission.id)}
          />
        ))}
      </Section>
      <View className="min-h-6 flex-1" />
    </OnboardingFrame>
  );
}
