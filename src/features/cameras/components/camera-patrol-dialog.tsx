import { useState } from 'react';
import { View } from 'react-native';
import type { CameraPatrol, CameraPatrolPatch, MenuOption } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { CameraPreset } from '@/features/cameras/model/camera-presets';
import {
  PATROL_DEFAULT_WINDOW,
  PATROL_HOURS,
  PATROL_MAX_STOPS,
  PATROL_PROBLEM_LABEL,
  addStop,
  crossesMidnight,
  formatPatrolHour,
  moveStop,
  parseDwell,
  patrolDraftOf,
  patrolPatch,
  patrolProblems,
  removeStop,
  stopName,
  type PatrolDraft,
  type PatrolProblem,
} from '@/features/cameras/model/camera-patrol';

type CameraPatrolDialogProps = {
  open: boolean;
  patrol: CameraPatrol | null;
  presets: readonly CameraPreset[];
  onOpenChange: (open: boolean) => void;
  onSave: (patch: CameraPatrolPatch) => Promise<boolean>;
};

type StopRowProps = {
  index: number;
  name: string;
  last: boolean;
  onMove: (index: number, offset: -1 | 1) => void;
  onRemove: (index: number) => void;
};

type HourSelectProps = {
  label: string;
  value: number;
  onChange: (hour: number) => void;
};

const HOUR_OPTIONS: readonly MenuOption[] = PATROL_HOURS.map((hour) => ({
  value: String(hour),
  label: formatPatrolHour(hour),
}));

function StopRow({ index, name, last, onMove, onRemove }: StopRowProps) {
  const { t } = useTranslation();
  return (
    <View className="bg-surface-secondary flex-row items-center gap-2 rounded-2xl py-1 pr-1 pl-3">
      <Text variant="label" className="text-foreground-secondary w-6">
        {index + 1}
      </Text>
      <Text variant="body" numberOfLines={1} className="min-w-0 flex-1">
        {name}
      </Text>
      <IconButton
        icon="chevron-up"
        label={t('screens.cameras.patrol.stop-up', { name })}
        disabled={index === 0}
        onPress={() => onMove(index, -1)}
      />
      <IconButton
        icon="chevron-down"
        label={t('screens.cameras.patrol.stop-down', { name })}
        disabled={last}
        onPress={() => onMove(index, 1)}
      />
      <IconButton icon="x" label={t('screens.cameras.patrol.stop-remove', { name })} onPress={() => onRemove(index)} />
    </View>
  );
}

function HourSelect({ label, value, onChange }: HourSelectProps) {
  const { t } = useTranslation();
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text variant="micro">{label}</Text>
      <AdaptiveSelect
        options={HOUR_OPTIONS}
        value={String(value)}
        onChange={(next) => onChange(Number(next))}
        title={label}
        closeLabel={t('common.close')}
        searchPlaceholder={label}
        emptyLabel={label}
        filterThreshold={HOUR_OPTIONS.length + 1}
        trigger={<SelectField label={formatPatrolHour(value)} accessibilityHint={label} />}
      />
    </View>
  );
}

export function CameraPatrolDialog({ open, patrol, presets, onOpenChange, onSave }: CameraPatrolDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PatrolDraft>(() => patrolDraftOf(patrol));
  const [dwellText, setDwellText] = useState(() => String(patrolDraftOf(patrol).dwellSeconds));
  const [problems, setProblems] = useState<readonly PatrolProblem[]>([]);
  const [saving, setSaving] = useState(false);
  const full = draft.stops.length >= PATROL_MAX_STOPS;
  const unnamed = t('screens.cameras.patrol.unnamed-stop');

  const submit = async () => {
    const next: PatrolDraft = { ...draft, dwellSeconds: parseDwell(dwellText) };
    const found = patrolProblems(next, presets);
    setProblems(found);
    if (found.length > 0) return;
    setSaving(true);
    const saved = await onSave(patrolPatch(patrol, next));
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  const setWindowOn = (on: boolean) =>
    setDraft((current) => ({ ...current, window: on ? (current.window ?? PATROL_DEFAULT_WINDOW) : null }));

  const setHour = (key: 'startHour' | 'endHour', hour: number) =>
    setDraft((current) => ({ ...current, window: { ...(current.window ?? PATROL_DEFAULT_WINDOW), [key]: hour } }));

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={patrol ? t('screens.cameras.patrol.edit-title') : t('screens.cameras.patrol.create-title')}
      description={t('screens.cameras.patrol.dialog-description')}
      closeLabel={t('common.close')}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} onPress={() => void submit()}>
            <Text>{t('screens.cameras.patrol.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-5 pb-1">
        <View className="gap-2">
          <Text variant="label">{t('screens.cameras.patrol.stops')}</Text>
          <Text variant="caption">{t('screens.cameras.patrol.stops-hint')}</Text>
          {draft.stops.length === 0 ? (
            <Text variant="caption">{t('screens.cameras.patrol.stops-empty')}</Text>
          ) : (
            draft.stops.map((stop, index) => (
              <StopRow
                key={`${stop}-${index}`}
                index={index}
                name={stopName(stop, presets, unnamed)}
                last={index === draft.stops.length - 1}
                onMove={(position, offset) => setDraft((current) => moveStop(current, position, offset))}
                onRemove={(position) => setDraft((current) => removeStop(current, position))}
              />
            ))
          )}
          <Text variant="micro" className="pt-1">
            {full ? t('screens.cameras.patrol.stops-full') : t('screens.cameras.patrol.add-stop')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                variant="outline"
                disabled={full}
                accessibilityLabel={t('screens.cameras.patrol.add-stop-named', { name: stopName(preset.id, presets, unnamed) })}
                onPress={() => setDraft((current) => addStop(current, preset.id))}>
                <Icon name="plus" className="text-foreground size-4" />
                <Text>{stopName(preset.id, presets, unnamed)}</Text>
              </Button>
            ))}
          </View>
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('screens.cameras.patrol.dwell')}</Text>
          <Input
            value={dwellText}
            onChangeText={setDwellText}
            accessibilityLabel={t('screens.cameras.patrol.dwell')}
            keyboardType="number-pad"
            variant={problems.includes('dwell') ? 'error' : 'default'}
          />
          <Text variant="caption">{t('screens.cameras.patrol.dwell-hint')}</Text>
        </View>
        <View className="gap-2">
          <ToggleRow
            label={t('screens.cameras.patrol.window-on')}
            hint={t('screens.cameras.patrol.window-hint')}
            value={draft.window !== null}
            onChange={setWindowOn}
          />
          {draft.window ? (
            <>
              <View className="flex-row gap-3">
                <HourSelect
                  label={t('screens.cameras.patrol.window-start')}
                  value={draft.window.startHour}
                  onChange={(hour) => setHour('startHour', hour)}
                />
                <HourSelect
                  label={t('screens.cameras.patrol.window-end')}
                  value={draft.window.endHour}
                  onChange={(hour) => setHour('endHour', hour)}
                />
              </View>
              {crossesMidnight(draft.window) ? (
                <Text variant="caption">{t('screens.cameras.patrol.window-overnight')}</Text>
              ) : null}
            </>
          ) : null}
        </View>
        <ToggleRow
          label={t('screens.cameras.patrol.enabled')}
          hint={t('screens.cameras.patrol.enabled-hint')}
          value={draft.enabled}
          onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
        />
        {problems.length > 0 ? (
          <View className="gap-1">
            {problems.map((problem) => (
              <Text key={problem} variant="caption" className="text-error-strong">
                {t(PATROL_PROBLEM_LABEL[problem])}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </AdaptiveDialog>
  );
}
