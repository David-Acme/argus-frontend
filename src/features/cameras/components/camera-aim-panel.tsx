import { useState } from 'react';
import { View } from 'react-native';
import type { CameraNoAimSector } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Input } from '@/shared/components/ui/input';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import type { CameraAimControls } from '@/features/cameras/hooks/use-camera-aim';
import {
  NO_AIM_SECTOR_MAX,
  NO_AIM_SECTOR_NAME_MAX,
  closeSector,
  formatDegrees,
  sectorProblem,
  sectorRange,
  type SectorMark,
  type SectorProblem,
} from '@/features/cameras/model/camera-aim';

type CameraAimPanelProps = {
  controls: CameraAimControls;
  className?: string;
};

type SectorRowProps = {
  sector: CameraNoAimSector;
  disabled: boolean;
  onRemove: (sector: CameraNoAimSector) => void;
};

type SectorDraftProps = {
  start: SectorMark | null;
  end: SectorMark | null;
  name: string;
  problem: SectorProblem | null;
  busy: boolean;
  onMarkStart: () => void;
  onMarkEnd: () => void;
  onName: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

function SectorRow({ sector, disabled, onRemove }: SectorRowProps) {
  const { t } = useTranslation();
  return (
    <View className="bg-surface-secondary flex-row items-center gap-3 rounded-2xl px-3 py-2">
      <Icon name="eye-off" className="text-foreground-secondary size-4" />
      <View className="min-w-0 flex-1">
        <Text variant="label" numberOfLines={1}>
          {sector.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {sectorRange(sector)}
        </Text>
      </View>
      <IconButton
        icon="trash"
        label={t('screens.cameras.sight.sector-remove', { name: sector.name })}
        disabled={disabled}
        onPress={() => onRemove(sector)}
      />
    </View>
  );
}

function SectorDraft({ start, end, name, problem, busy, onMarkStart, onMarkEnd, onName, onSave, onCancel }: SectorDraftProps) {
  const { t } = useTranslation();
  const mark = (value: SectorMark) =>
    t('screens.cameras.sight.sector-mark', { pan: formatDegrees(value.pan), tilt: formatDegrees(value.tilt) });

  return (
    <View className="border-border gap-3 rounded-2xl border border-dashed p-3">
      <Text variant="caption">{t('screens.cameras.sight.sector-howto')}</Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <Button variant={start ? 'secondary' : 'default'} size="sm" loading={busy && !start} onPress={onMarkStart}>
          <Text>{t('screens.cameras.sight.sector-start')}</Text>
        </Button>
        {start ? <Text variant="caption">{mark(start)}</Text> : null}
      </View>
      <View className="flex-row flex-wrap items-center gap-2">
        <Button
          variant={end ? 'secondary' : 'default'}
          size="sm"
          disabled={!start}
          loading={busy && start !== null && !end}
          onPress={onMarkEnd}>
          <Text>{t('screens.cameras.sight.sector-end')}</Text>
        </Button>
        {end ? <Text variant="caption">{mark(end)}</Text> : null}
      </View>
      {start && end ? (
        <View className="gap-1.5">
          <Text variant="label">{t('screens.cameras.sight.sector-name')}</Text>
          <Input
            value={name}
            maxLength={NO_AIM_SECTOR_NAME_MAX}
            placeholder={t('screens.cameras.sight.sector-name-placeholder')}
            accessibilityLabel={t('screens.cameras.sight.sector-name')}
            onChangeText={onName}
            onSubmitEditing={onSave}
          />
        </View>
      ) : null}
      {problem ? (
        <Text variant="caption" className="text-error-strong">
          {t(`screens.cameras.sight.sector-problem.${problem}`)}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onPress={onCancel}>
          <Text>{t('common.cancel')}</Text>
        </Button>
        <Button size="sm" disabled={!start || !end} loading={busy && start !== null && end !== null} onPress={onSave}>
          <Text>{t('screens.cameras.sight.sector-save')}</Text>
        </Button>
      </View>
    </View>
  );
}

export function CameraAimPanel({ controls, className }: CameraAimPanelProps) {
  const { t } = useTranslation();
  const [drafting, setDrafting] = useState(false);
  const [start, setStart] = useState<SectorMark | null>(null);
  const [end, setEnd] = useState<SectorMark | null>(null);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState<SectorProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const { settings, homePreset, update, readPosition } = controls;
  const hasHome = homePreset !== null;
  const sectors = settings.noAimSectors;
  const full = sectors.length >= NO_AIM_SECTOR_MAX;

  const reset = () => {
    setDrafting(false);
    setStart(null);
    setEnd(null);
    setName('');
    setProblem(null);
  };

  const capture = async (target: (mark: SectorMark) => void) => {
    setBusy(true);
    const mark = await readPosition();
    setBusy(false);
    if (mark) target(mark);
  };

  const save = async () => {
    if (!start || !end) return;
    const next = [...sectors, closeSector(start, end, name)];
    const found = sectorProblem(next);
    setProblem(found);
    if (found) return;
    setBusy(true);
    const saved = await update({ noAimSectors: next });
    setBusy(false);
    if (saved) reset();
  };

  const remove = (sector: CameraNoAimSector) =>
    void update({ noAimSectors: sectors.filter((candidate) => candidate !== sector) });

  return (
    <Panel
      title={t('screens.cameras.sight.title')}
      description={t('screens.cameras.sight.description')}
      className={cn('gap-2', className)}>
      <ToggleRow
        label={t('screens.cameras.sight.active-look')}
        hint={hasHome ? t('screens.cameras.sight.active-look-hint') : t('screens.cameras.sight.active-look-needs-home')}
        value={settings.activeLook && hasHome}
        disabled={!hasHome}
        onChange={(activeLook) => void update({ activeLook })}
      />
      <ToggleRow
        label={t('screens.cameras.sight.follow')}
        hint={t('screens.cameras.sight.follow-hint')}
        value={settings.followIntruders}
        disabled={!hasHome}
        onChange={(followIntruders) => void update({ followIntruders })}
      />
      <ToggleRow
        label={t('screens.cameras.sight.patrol')}
        hint={t('screens.cameras.sight.patrol-hint')}
        value={settings.patrol}
        disabled={!hasHome}
        onChange={(patrol) => void update({ patrol })}
      />
      <View className="gap-2 pt-2">
        <View className="flex-row items-center gap-2">
          <Text variant="label" className="min-w-0 flex-1">
            {t('screens.cameras.sight.sectors')}
          </Text>
          {!drafting && !full ? (
            <Button variant="ghost" size="sm" onPress={() => setDrafting(true)}>
              <Icon name="plus" className="text-foreground size-4" />
              <Text>{t('screens.cameras.sight.sector-add')}</Text>
            </Button>
          ) : null}
        </View>
        <Text variant="caption">{t('screens.cameras.sight.sectors-hint')}</Text>
        {sectors.length === 0 && !drafting ? (
          <Text variant="caption">{t('screens.cameras.sight.sectors-empty')}</Text>
        ) : null}
        {sectors.map((sector, index) => (
          <SectorRow key={`${sector.name}-${index}`} sector={sector} disabled={busy} onRemove={remove} />
        ))}
        {full ? <Text variant="caption">{t('screens.cameras.sight.sectors-full')}</Text> : null}
        {drafting ? (
          <SectorDraft
            start={start}
            end={end}
            name={name}
            problem={problem}
            busy={busy}
            onMarkStart={() => void capture(setStart)}
            onMarkEnd={() => void capture(setEnd)}
            onName={setName}
            onSave={() => void save()}
            onCancel={reset}
          />
        ) : null}
      </View>
    </Panel>
  );
}
