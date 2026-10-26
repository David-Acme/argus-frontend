import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import { Section } from '@/shared/ui/section';
import { useCameraFrames, type CameraTiles } from '@/features/security/hooks/use-security-cameras';
import { onlineCount, PHONE_TILES, sparseGrid } from '@/features/security/model/camera-tiles';
import { CameraGrid } from '@/features/security/components/page/camera-grid';

type CamerasSectionProps = {
  cameras: CameraTiles;
  desktop: boolean;
  onConnect: () => void;
};

export function CamerasSection({ cameras, desktop, onConnect }: CamerasSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const shown = desktop ? cameras.tiles : cameras.tiles.slice(0, PHONE_TILES);
  const frames = useCameraFrames(cameras.visible ? cameras.cameras : [], shown);
  const total = cameras.tiles.length;
  const openAll = () => router.push('/cameras');
  if (!cameras.visible) return null;
  const title = t('screens.security.camera-grid.title');
  const connect = { label: t('screens.security.camera-grid.connect'), onPress: onConnect };
  if (total === 0)
    return (
      <Section title={title} variant="plain">
        {cameras.canCreate ? (
          <Empty
            message={t('screens.security.camera-grid.empty')}
            detail={t('screens.security.camera-grid.empty-detail')}
            icon="cam"
            action={connect}
          />
        ) : (
          <Notice icon="cam" title={t('screens.security.camera-grid.empty')} />
        )}
      </Section>
    );
  const sparse = desktop && cameras.canCreate && sparseGrid(total);
  return (
    <Section
      title={title}
      meta={t('screens.security.camera-grid.online', {
        online: String(onlineCount(cameras.tiles)),
        total: String(total),
      })}
      action={
        sparse
          ? undefined
          : {
              label: desktop
                ? t('screens.security.camera-grid.all-short')
                : t('screens.security.camera-grid.all', { count: String(total) }),
              onPress: openAll,
            }
      }
      variant="plain">
      <View className="grow gap-3">
        <CameraGrid
          tiles={shown}
          frames={frames}
          now={cameras.now}
          format={cameras.format}
          fill={desktop && !sparse}
          onOpen={(id) => router.push(`/cameras/${id}`)}
          onTalk={cameras.canTalk ? (id) => router.push(`/cameras/${id}?talk=1`) : undefined}
        />
        {sparse ? (
          <Notice
            icon="plus"
            title={t('screens.security.camera-grid.another')}
            body={t('screens.security.camera-grid.empty-detail')}
            action={connect}
          />
        ) : null}
      </View>
    </Section>
  );
}
