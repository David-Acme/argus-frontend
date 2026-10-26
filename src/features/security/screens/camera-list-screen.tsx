import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { CameraForm } from '@/features/cameras';
import { CameraGrid } from '@/features/security/components/page/camera-grid';
import { useBack } from '@/features/security/hooks/use-back';
import { useCameraFrames, useCameraTiles } from '@/features/security/hooks/use-security-cameras';
import { onlineCount } from '@/features/security/model/camera-tiles';

const EVERYWHERE = { place: null, environments: [] } as const;

export default function CameraListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const back = useBack();
  const cameras = useCameraTiles(EVERYWHERE);
  const frames = useCameraFrames(cameras.cameras, cameras.tiles);
  const [connecting, setConnecting] = useState(false);
  const connect = {
    label: t('screens.security.camera-grid.connect'),
    onPress: () => setConnecting(true),
  };
  const total = cameras.tiles.length;
  return (
    <>
      <Screen
        title={t('screens.security.camera-grid.title')}
        meta={
          total > 0
            ? t('screens.security.camera-grid.online', {
                online: String(onlineCount(cameras.tiles)),
                total: String(total),
              })
            : undefined
        }
        back={back}
        actions={
          cameras.canCreate ? (
            <Button iconOnly glass icon="plus" label={connect.label} onPress={connect.onPress} />
          ) : undefined
        }>
        <Section variant="plain">
          {total > 0 ? (
            <CameraGrid
              tiles={cameras.tiles}
              frames={frames}
              now={cameras.now}
              format={cameras.format}
              fill={false}
              onOpen={(id) => router.push(`/cameras/${id}`)}
              onTalk={cameras.canTalk ? (id) => router.push(`/cameras/${id}?talk=1`) : undefined}
            />
          ) : cameras.canCreate ? (
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
      </Screen>
      {connecting ? <CameraForm open onOpenChange={setConnecting} /> : null}
    </>
  );
}
