import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useRecentClipTiles } from '@/features/home/hooks/use-recent-clip-tiles';
import { rowMoment } from '@/features/home/model/camera-moments';
import { GRID_COLUMNS, gridRows } from '@/features/home/model/camera-tiles';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Section } from '@/shared/ui/section';
import { ClipMedia } from './camera-media';

export function RecentClipsSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const recent = useRecentClipTiles();
  const open = (cameraId: string) => router.push(`/cameras/${cameraId}`);
  if (!recent.visible) return null;
  return (
    <Section title={t('screens.home.camera-sections.clips')} variant="plain">
      <View className="gap-media-gap flex-row">
        {(gridRows(recent.clips, GRID_COLUMNS)[0] ?? []).map((clip, slot) => (
          <View key={clip?.id ?? `slot-${slot}`} className="flex-1">
            {clip ? (
              <ClipMedia
                clip={clip}
                named={false}
                detail={rowMoment(clip.at, recent.now, recent.format)}
                onOpen={open}
              />
            ) : null}
          </View>
        ))}
      </View>
    </Section>
  );
}
