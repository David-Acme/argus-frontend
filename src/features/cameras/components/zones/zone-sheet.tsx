import { useState } from 'react';
import { View } from 'react-native';
import type { IZoneCacheRow } from '@/core/interfaces';
import { zoneService } from '@/core/services/zone.service';
import type { ZonePoint, ZoneType } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import type { ChoiceOption } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Inline, Stack } from '@/shared/ui/layout';
import { PressableSurface } from '@/shared/ui/pressable';
import { Sheet } from '@/shared/ui/sheet';
import { Text } from '@/shared/ui/text';
import { CameraLiveStream } from '@/features/cameras/components/camera-live-view';
import { CameraZonesOverlay } from '@/features/cameras/components/camera-zones-overlay';
import { ZoneEditor } from '@/features/cameras/components/zone-editor';
import { ZONE_COLORS } from '@/features/cameras/constants';
import { zoneDraftOf, zoneProblem } from '@/features/cameras/model/zone-draft';
import type { ZoneDraft, ZoneProblem } from '@/features/cameras/model/zone-draft';

export type ZoneSheetProps = {
  cameraId: string;
  zone: IZoneCacheRow | null;
  zones: readonly IZoneCacheRow[];
  onClose: () => void;
};

type SwatchesProps = { value: string; onChange: (color: string) => void };

type PointsProps = {
  draft: ZoneDraft;
  others: readonly IZoneCacheRow[];
  cameraId: string;
  onPoints: (points: ZonePoint[]) => void;
};

const PROBLEM = {
  name: 'screens.cameras.zone-sheet.name-missing',
  points: 'screens.cameras.zone-sheet.points-missing',
} as const;

const quiet = () => undefined;

function useZoneTypes(): ChoiceOption<ZoneType>[] {
  const { t } = useTranslation();
  return [
    { value: 'monitor', label: t('screens.cameras.zone-monitor') },
    { value: 'alert', label: t('screens.cameras.zone-alert') },
    { value: 'exclude', label: t('screens.cameras.zone-exclude') },
    { value: 'privacy', label: t('screens.cameras.zone-privacy') },
  ];
}

function Swatches({ value, onChange }: SwatchesProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={2}>
      <Text variant="label">{t('screens.cameras.zone-color')}</Text>
      <Inline gap={2}>
        {ZONE_COLORS.map((color, index) => (
          <PressableSurface
            key={color}
            a11y={{
              label: t('screens.cameras.zone-sheet.color', { index: String(index + 1) }),
              role: 'radio',
              checked: value === color,
            }}
            onPress={() => onChange(color)}
            haptic="selection"
            className={
              value === color
                ? 'size-target-min border-text items-center justify-center rounded-full border-2'
                : 'size-target-min items-center justify-center rounded-full'
            }>
            <View className="size-check rounded-full" style={{ backgroundColor: color }} />
          </PressableSurface>
        ))}
      </Inline>
    </Stack>
  );
}

function Points({ draft, others, cameraId, onPoints }: PointsProps) {
  const { t } = useTranslation();
  const count = draft.points.length;
  return (
    <Stack gap={2}>
      <Text variant="label">{t('screens.cameras.zone-points')}</Text>
      <ZoneEditor
        points={draft.points}
        onChange={onPoints}
        color={draft.color}
        background={
          <>
            <CameraLiveStream cameraId={cameraId} active fill onStatus={quiet} />
            <CameraZonesOverlay zones={others} />
          </>
        }
      />
      <Inline gap={2} justify="between">
        <Text variant="meta">
          {t('screens.cameras.zone-points-count', { count: String(count) })}
        </Text>
        {count > 0 ? (
          <Inline gap={2}>
            <Button
              compact
              variant="ghost"
              label={t('screens.cameras.zone-undo')}
              onPress={() => onPoints(draft.points.slice(0, -1))}
            />
            <Button
              compact
              variant="ghost"
              label={t('screens.cameras.zone-reset')}
              onPress={() => onPoints([])}
            />
          </Inline>
        ) : null}
      </Inline>
    </Stack>
  );
}

export function ZoneSheet({ cameraId, zone, zones, onClose }: ZoneSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ZoneDraft>(() => zoneDraftOf(zone));
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<ZoneProblem | null>(null);
  const others = zones.filter((item) => item.id !== zone?.id);
  const types = useZoneTypes();
  const edit = (patch: Partial<ZoneDraft>) => {
    setTouched(true);
    setProblem(null);
    setDraft((current) => ({ ...current, ...patch }));
  };
  const save = async () => {
    const found = zoneProblem(draft);
    setProblem(found);
    if (found) return;
    const body = { ...draft, name: draft.name.trim() };
    const saved = await runOptimistic({
      intents: [
        zone
          ? { table: 'zone', kind: 'update', recordId: zone.id, values: body }
          : { table: 'zone', kind: 'create', values: { ...body, cameraId: Number(cameraId) } },
      ],
      call: () =>
        zone
          ? zoneService.update(zone.id, body)
          : zoneService.create({ ...body, cameraId: Number(cameraId) }),
      success: t('screens.cameras.zone-saved'),
    });
    if (saved) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={zone ? t('screens.cameras.edit-zone') : t('screens.cameras.add-zone')}
      variant="form"
      long
      dirty={touched ? draft.name.trim() || true : false}
      actions={{ primary: { label: t('common.save'), onPress: save } }}>
      <Stack gap={6}>
        <Field
          label={t('screens.cameras.zone-name')}
          value={draft.name}
          error={problem === 'name' ? t(PROBLEM.name) : undefined}
          onChangeText={(name) => edit({ name })}
        />
        <Stack gap={2}>
          <Text variant="label">{t('screens.cameras.zone-type')}</Text>
          <Choice
            label={t('screens.cameras.zone-type')}
            look="field"
            options={types}
            value={draft.zoneType}
            onChange={(zoneType) => edit({ zoneType })}
          />
          {draft.zoneType === 'privacy' ? (
            <Text variant="meta">{t('screens.cameras.zone-privacy-hint')}</Text>
          ) : null}
        </Stack>
        <Swatches value={draft.color} onChange={(color) => edit({ color })} />
        <Points
          draft={draft}
          others={others}
          cameraId={cameraId}
          onPoints={(points) => edit({ points })}
        />
        {problem === 'points' ? (
          <Text variant="meta" tone="alert">
            {t(PROBLEM.points)}
          </Text>
        ) : null}
      </Stack>
    </Sheet>
  );
}
