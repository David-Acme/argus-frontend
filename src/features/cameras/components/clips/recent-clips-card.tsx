import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { ICameraClip } from '@/core/interfaces';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Section } from '@/shared/ui/section';
import { ClipTile } from '@/features/cameras/components/clips/clip-tile';
import { CLIP_HREF, CLIPS_HREF } from '@/features/cameras/constants/routes.constant';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { useClipFeed } from '@/features/cameras/hooks/use-clip-feed';
import {
  CLIP_FEED_ALL,
  clipGridRows,
  clipMoment,
  visibleClips,
} from '@/features/cameras/model/camera-clips';

const RECENT = 3;

const MINUTE_MS = 60_000;

export function RecentClipsCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const date = useDateFormatter();
  const now = useNow(MINUTE_MS);
  const { clips: access } = useCapabilities();
  const { cameras } = useCameraRows();
  const feed = useClipFeed(null, access.view);
  const names = new Map(cameras.map((camera) => [camera.id, camera.name]));
  const recent = visibleClips(feed.rows, names).slice(0, RECENT);
  if (!access.view || recent.length === 0) return null;
  const open = (clip: ICameraClip) =>
    router.push({
      pathname: CLIP_HREF,
      params: { id: clip.id, camera: clip.cameraId, scope: CLIP_FEED_ALL },
    });
  const [row] = clipGridRows(recent, RECENT);
  return (
    <Section
      title={t('screens.cameras.clips.recent')}
      action={{ label: t('screens.cameras.clips.see-all'), onPress: () => router.push(CLIPS_HREF) }}
      variant="plain">
      <View className="gap-media-gap flex-row">
        {(row ?? []).map((clip, slot) => (
          <View key={clip?.id ?? `slot-${slot}`} className="min-w-0 flex-1">
            {clip ? (
              <ClipTile
                clip={clip}
                cameraName={names.get(clip.cameraId) ?? ''}
                moment={clipMoment({
                  at: clip.startedAt * 1000,
                  now,
                  t,
                  time: date.formatTime,
                  day: date.formatDayMonth,
                })}
                showCamera={cameras.length > 1}
                onOpen={open}
              />
            ) : null}
          </View>
        ))}
      </View>
    </Section>
  );
}
