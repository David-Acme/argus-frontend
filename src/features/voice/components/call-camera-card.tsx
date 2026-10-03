import { View } from 'react-native';
import { CameraLiveView } from '@/features/cameras';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type CallCameraCardProps = {
  cameraId: string;
  name: string;
  onClose: () => void;
  onOpen: () => void;
};

export function CallCameraCard({ cameraId, name, onClose, onOpen }: CallCameraCardProps) {
  const { t } = useTranslation();
  return (
    <View className="bg-card w-full gap-3 rounded-3xl p-3 shadow-sm shadow-black/10">
      <View className="flex-row items-center gap-2 px-1">
        <Icon name="video" className="text-foreground-secondary size-4" />
        <Text variant="label" numberOfLines={1} className="flex-1">
          {name}
        </Text>
        <IconButton icon="arrow-up-right" label={t('screens.voice.camera.open', { name })} onPress={onOpen} />
        <IconButton icon="x" label={t('screens.voice.camera.close')} onPress={onClose} />
      </View>
      <CameraLiveView cameraId={cameraId} quality="sub" />
    </View>
  );
}
