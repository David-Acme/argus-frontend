import { useState } from 'react';
import { View } from 'react-native';
import { CameraLiveView } from '@/features/cameras/components/players';
import { PtzPad } from '@/features/cameras/components/live/ptz-pad';
import { useViewerLease, type CameraAimControls } from '@/features/cameras/hooks/use-camera-aim';
import { useCameraPtz } from '@/features/cameras/hooks/use-camera-ptz';
import {
  NO_AIM_SECTOR_NAME_MAX,
  closeSector,
  formatDegrees,
  sectorProblem,
  type SectorMark,
} from '@/features/cameras/model/camera-aim';
import { useTranslation } from '@/shared/hooks/use-translation';
import { illustration, layout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Inline, Stack } from '@/shared/ui/layout';
import { Sheet } from '@/shared/ui/sheet';
import { Text } from '@/shared/ui/text';

export type SectorSheetProps = {
  cameraId: string;
  aim: CameraAimControls;
  holdRenewMs: number | null;
  onClose: () => void;
};

type MarkStepProps = { label: string; mark: SectorMark | null; onMark: () => Promise<void> };

const FRAME = { aspectRatio: layout.mediaAspect, backgroundColor: illustration.media };

const SECTOR_PROBLEM = {
  'too-many': 'screens.cameras.sight.sector-problem.too-many',
  name: 'screens.cameras.sight.sector-problem.name',
  pan: 'screens.cameras.sight.sector-problem.pan',
  tilt: 'screens.cameras.sight.sector-problem.tilt',
  order: 'screens.cameras.sight.sector-problem.order',
} as const;

const quiet = () => undefined;

function MarkStep({ label, mark, onMark }: MarkStepProps) {
  const { t } = useTranslation();
  return (
    <Inline gap={3}>
      <Button compact variant={mark ? 'secondary' : 'primary'} label={label} onPress={onMark} />
      {mark ? (
        <Text variant="meta">
          {t('screens.cameras.sight.sector-mark', {
            pan: formatDegrees(mark.pan),
            tilt: formatDegrees(mark.tilt),
          })}
        </Text>
      ) : null}
    </Inline>
  );
}

export function SectorSheet({ cameraId, aim, holdRenewMs, onClose }: SectorSheetProps) {
  const { t } = useTranslation();
  const ptz = useCameraPtz(cameraId, holdRenewMs);
  const [start, setStart] = useState<SectorMark | null>(null);
  const [end, setEnd] = useState<SectorMark | null>(null);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<keyof typeof SECTOR_PROBLEM | null>(null);
  useViewerLease(cameraId, true, aim.apply);
  const capture = async (target: (mark: SectorMark) => void) => {
    const mark = await aim.readPosition();
    if (mark) target(mark);
  };
  const save = async () => {
    if (!start || !end) return;
    const next = [...aim.settings.noAimSectors, closeSector(start, end, name)];
    const found = sectorProblem(next);
    setProblem(found);
    if (found) return;
    if (await aim.update({ noAimSectors: next })) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={t('screens.cameras.sight.sector-add')}
      variant="form"
      long
      dirty={start !== null || name.trim().length > 0}
      actions={{
        primary: {
          label: t('screens.cameras.sight.sector-save'),
          onPress: save,
          disabled: !start || !end,
        },
      }}>
      <Stack gap={4}>
        <View className="rounded-media relative overflow-hidden" style={FRAME}>
          <CameraLiveView cameraId={cameraId} fill className="rounded-none" onStatus={quiet} />
          <PtzPad ptz={ptz} />
        </View>
        <Text variant="meta">{t('screens.cameras.sight.sector-howto')}</Text>
        <MarkStep
          label={t('screens.cameras.sight.sector-start')}
          mark={start}
          onMark={() => capture(setStart)}
        />
        {start ? (
          <MarkStep
            label={t('screens.cameras.sight.sector-end')}
            mark={end}
            onMark={() => capture(setEnd)}
          />
        ) : null}
        {start && end ? (
          <Field
            label={t('screens.cameras.sight.sector-name')}
            placeholder={t('screens.cameras.sight.sector-name-placeholder')}
            value={name}
            error={problem ? t(SECTOR_PROBLEM[problem]) : undefined}
            onChangeText={(text) => setName(text.slice(0, NO_AIM_SECTOR_NAME_MAX))}
          />
        ) : null}
      </Stack>
    </Sheet>
  );
}
