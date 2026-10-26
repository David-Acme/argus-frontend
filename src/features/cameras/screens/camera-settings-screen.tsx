import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AdvancedSection } from '@/features/cameras/components/settings/advanced-section';
import { DetectionSection } from '@/features/cameras/components/settings/detection-section';
import { DeviceSection } from '@/features/cameras/components/settings/device-section';
import { GazeSection } from '@/features/cameras/components/settings/gaze-section';
import { ListenSection } from '@/features/cameras/components/settings/listen-section';
import { PatrolSection } from '@/features/cameras/components/settings/patrol-section';
import { PlacesSection } from '@/features/cameras/components/settings/places-section';
import { PrivacySection } from '@/features/cameras/components/settings/privacy-section';
import { useCameraRow } from '@/features/cameras/hooks/use-camera-live';
import {
  useCameraSettings,
  type CameraSettings,
} from '@/features/cameras/hooks/use-camera-settings';
import type { SettingsSection } from '@/features/cameras/model/camera-settings';
import { MaintenancePanel } from '@/features/security';
import { CAMERA_LIST_HREF } from '@/features/cameras/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Screen } from '@/shared/ui/screen';

const SECTIONS: Record<SettingsSection, (settings: CameraSettings) => ReactNode> = {
  privacy: (settings) => <PrivacySection key="privacy" settings={settings} />,
  detection: (settings) => <DetectionSection key="detection" settings={settings} />,
  listen: (settings) => <ListenSection key="listen" settings={settings} />,
  gaze: (settings) => <GazeSection key="gaze" settings={settings} />,
  patrol: (settings) => <PatrolSection key="patrol" settings={settings} />,
  places: (settings) => <PlacesSection key="places" settings={settings} />,
  maintenance: (settings) => (
    <View key="maintenance" className="mt-section-top">
      <MaintenancePanel cameraId={settings.camera.id} />
    </View>
  ),
  device: (settings) => <DeviceSection key="device" settings={settings} />,
  advanced: (settings) => <AdvancedSection key="advanced" settings={settings} />,
};

export default function CameraSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useCameraSettings(id, useCameraRow(id));
  if (!settings) return <Redirect href={CAMERA_LIST_HREF} />;
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/cameras/${id}`));
  return (
    <Screen
      title={t('screens.cameras.settings')}
      meta={settings.camera.name}
      back={{ label: t('common.back'), onPress: back }}>
      {settings.sections.map((section) => SECTIONS[section](settings))}
    </Screen>
  );
}
