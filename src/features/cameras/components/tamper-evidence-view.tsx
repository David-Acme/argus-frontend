import { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { ClipPlayer } from './clip-player';
import { useTamperEvidence } from '@/features/cameras/hooks/use-tamper-evidence';
import { clipImageUri } from '@/features/cameras/model/camera-clips';
import { decodeBase64, splitClipFile } from '@/features/cameras/model/clip-media';
import {
  evidenceVideo,
  lastGoodFrame,
  lookCrops,
  type TamperEvidenceItem,
  type TamperEvidenceTarget,
} from '@/features/cameras/model/tamper-evidence';

type TamperEvidenceViewProps = {
  target: TamperEvidenceTarget;
  enabled: boolean;
  looks?: boolean;
  quiet?: boolean;
};

type EvidenceImageProps = {
  item: TamperEvidenceItem;
  label: string;
  wide: boolean;
};

const FRAME_ASPECT = 16 / 9;

function EvidenceImage({ item, label, wide }: EvidenceImageProps) {
  return (
    <View
      className={
        wide
          ? 'bg-surface-secondary dark:bg-card-secondary w-full overflow-hidden rounded-2xl'
          : 'bg-surface-secondary dark:bg-card-secondary size-24 overflow-hidden rounded-xl'
      }
      style={wide ? { aspectRatio: FRAME_ASPECT } : undefined}>
      <Image
        source={{ uri: clipImageUri(item.contentType, item.base64) }}
        resizeMode="cover"
        accessible
        accessibilityLabel={label}
        accessibilityIgnoresInvertColors
        className="absolute inset-0 h-full w-full"
      />
    </View>
  );
}

export function TamperEvidenceView({ target, enabled, looks = false, quiet = false }: TamperEvidenceViewProps) {
  const { t } = useTranslation();
  const { evidence, status, retry } = useTamperEvidence(target, enabled);
  const [playing, setPlaying] = useState(false);
  const frame = lastGoodFrame(evidence);
  const crops = lookCrops(evidence);
  const video = evidenceVideo(evidence);
  const file = useMemo(() => (playing && video ? splitClipFile(decodeBase64(video.base64)) : null), [playing, video]);

  if (!enabled) return null;
  if (!evidence && quiet) return null;
  if (!evidence) {
    return (
      <View className="flex-row flex-wrap items-center gap-2">
        <Icon name={status === 'failed' ? 'image-down' : 'loader-circle'} className="text-muted-foreground size-4" />
        <Text variant="caption" className="min-w-0 flex-1">
          {status === 'failed' ? t('screens.security.tamper.evidence-missing') : t('screens.security.tamper.evidence-loading')}
        </Text>
        {status === 'failed' ? (
          <Button variant="ghost" size="sm" onPress={retry}>
            <Text>{t('common.retry')}</Text>
          </Button>
        ) : null}
      </View>
    );
  }

  return (
    <View className="gap-3">
      {frame ? (
        <View className="gap-1.5">
          <Text variant="micro">{t('screens.security.tamper.last-frame')}</Text>
          <EvidenceImage item={frame} label={t('screens.security.tamper.last-frame')} wide />
        </View>
      ) : null}
      {looks && crops.length > 0 ? (
        <View className="gap-1.5">
          <Text variant="micro">{t('screens.security.tamper.look-crops')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {crops.map((item) => (
              <EvidenceImage key={item.clipId} item={item} label={t('screens.security.tamper.look-crops')} wide={false} />
            ))}
          </View>
        </View>
      ) : null}
      {video ? (
        playing ? (
          file ? (
            <ClipPlayer file={file} onEnded={() => setPlaying(false)} />
          ) : (
            <Text variant="caption">{t('screens.cameras.clips.unsupported')}</Text>
          )
        ) : (
          <Button variant="outline" size="sm" className="self-start" onPress={() => setPlaying(true)}>
            <Icon name="play" className="text-foreground size-4" />
            <Text>{t('screens.security.tamper.play-clip')}</Text>
          </Button>
        )
      ) : null}
    </View>
  );
}
