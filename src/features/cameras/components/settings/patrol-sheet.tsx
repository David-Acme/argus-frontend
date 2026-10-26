import { useState } from 'react';
import { View } from 'react-native';
import type { CameraPatrol, CameraPatrolPatch } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Cluster, Inline, Stack } from '@/shared/ui/layout';
import { Row } from '@/shared/ui/row';
import { Sheet } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
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
} from '@/features/cameras/model/camera-patrol';
import type { PatrolDraft, PatrolProblem } from '@/features/cameras/model/camera-patrol';

export type PatrolSheetProps = {
  patrol: CameraPatrol | null;
  presets: readonly CameraPreset[];
  onClose: () => void;
  onSave: (patch: CameraPatrolPatch) => Promise<boolean>;
};

type StopsProps = {
  draft: PatrolDraft;
  presets: readonly CameraPreset[];
  onDraft: (next: (draft: PatrolDraft) => PatrolDraft) => void;
};

type WindowFieldsProps = {
  draft: PatrolDraft;
  onDraft: (next: (draft: PatrolDraft) => PatrolDraft) => void;
};

const HOURS = PATROL_HOURS.map((hour) => ({ value: String(hour), label: formatPatrolHour(hour) }));

function Stops({ draft, presets, onDraft }: StopsProps) {
  const { t } = useTranslation();
  const unnamed = t('screens.cameras.patrol.unnamed-stop');
  const full = draft.stops.length >= PATROL_MAX_STOPS;
  return (
    <Stack gap={2}>
      <Text variant="label">{t('screens.cameras.patrol.stops')}</Text>
      <Text variant="meta">{t('screens.cameras.patrol.stops-hint')}</Text>
      {draft.stops.map((stop, index) => {
        const name = stopName(stop, presets, unnamed);
        return (
          <Row
            key={`${stop}-${index}`}
            title={name}
            trailing={
              <Inline gap={1}>
                {index > 0 ? (
                  <Button
                    iconOnly
                    compact
                    icon="chevu"
                    label={t('screens.cameras.patrol.stop-up', { name })}
                    onPress={() => onDraft((current) => moveStop(current, index, -1))}
                  />
                ) : null}
                {index < draft.stops.length - 1 ? (
                  <Button
                    iconOnly
                    compact
                    icon="chevd"
                    label={t('screens.cameras.patrol.stop-down', { name })}
                    onPress={() => onDraft((current) => moveStop(current, index, 1))}
                  />
                ) : null}
                <Button
                  iconOnly
                  compact
                  icon="x"
                  label={t('screens.cameras.patrol.stop-remove', { name })}
                  onPress={() => onDraft((current) => removeStop(current, index))}
                />
              </Inline>
            }
          />
        );
      })}
      {full ? (
        <Text variant="meta">{t('screens.cameras.patrol.stops-full')}</Text>
      ) : (
        <Cluster gap={2}>
          {presets.map((preset) => (
            <Button
              compact
              variant="secondary"
              key={preset.id}
              icon="plus"
              label={stopName(preset.id, presets, unnamed)}
              onPress={() => onDraft((current) => addStop(current, preset.id))}
            />
          ))}
        </Cluster>
      )}
    </Stack>
  );
}

function WindowFields({ draft, onDraft }: WindowFieldsProps) {
  const { t } = useTranslation();
  const setHour = (key: 'startHour' | 'endHour', hour: string) =>
    onDraft((current) => ({
      ...current,
      window: { ...(current.window ?? PATROL_DEFAULT_WINDOW), [key]: Number(hour) },
    }));
  return (
    <View>
      <Row
        title={t('screens.cameras.patrol.window-on')}
        meta={t('screens.cameras.patrol.window-hint')}
        trailing={
          <Switch
            value={draft.window !== null}
            label={t('screens.cameras.patrol.window-on')}
            onValueChange={(on) =>
              onDraft((current) => ({
                ...current,
                window: on ? (current.window ?? PATROL_DEFAULT_WINDOW) : null,
              }))
            }
          />
        }
      />
      {draft.window ? (
        <Inline gap={3} fill>
          <Choice
            look="field"
            label={t('screens.cameras.patrol.window-start')}
            options={HOURS}
            value={String(draft.window.startHour)}
            onChange={(hour) => setHour('startHour', hour)}
          />
          <Choice
            look="field"
            label={t('screens.cameras.patrol.window-end')}
            options={HOURS}
            value={String(draft.window.endHour)}
            onChange={(hour) => setHour('endHour', hour)}
          />
        </Inline>
      ) : null}
      {draft.window && crossesMidnight(draft.window) ? (
        <Text variant="meta">{t('screens.cameras.patrol.window-overnight')}</Text>
      ) : null}
    </View>
  );
}

export function PatrolSheet({ patrol, presets, onClose, onSave }: PatrolSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PatrolDraft>(() => patrolDraftOf(patrol));
  const [dwell, setDwell] = useState(() => String(patrolDraftOf(patrol).dwellSeconds));
  const [problems, setProblems] = useState<readonly PatrolProblem[]>([]);
  const [touched, setTouched] = useState(false);
  const edit = (next: (current: PatrolDraft) => PatrolDraft) => {
    setTouched(true);
    setDraft(next);
  };
  const submit = async () => {
    const next: PatrolDraft = { ...draft, dwellSeconds: parseDwell(dwell) };
    const found = patrolProblems(next, presets);
    setProblems(found);
    if (found.length > 0) return;
    if (await onSave(patrolPatch(patrol, next))) onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={
        patrol ? t('screens.cameras.patrol.edit-title') : t('screens.cameras.patrol.create-title')
      }
      variant="form"
      long
      dirty={touched}
      actions={{ primary: { label: t('screens.cameras.patrol.save'), onPress: submit } }}>
      <Stack gap={6}>
        <Text variant="meta">{t('screens.cameras.patrol.rule-away')}</Text>
        <Stops draft={draft} presets={presets} onDraft={edit} />
        <Field
          kind="text"
          content="number"
          label={t('screens.cameras.patrol.dwell')}
          hint={t('screens.cameras.patrol.dwell-hint')}
          value={dwell}
          error={problems.includes('dwell') ? t(PATROL_PROBLEM_LABEL.dwell) : undefined}
          onChangeText={(text) => {
            setTouched(true);
            setDwell(text);
          }}
        />
        <WindowFields draft={draft} onDraft={edit} />
        {problems
          .filter((problem) => problem !== 'dwell')
          .map((problem) => (
            <Text key={problem} variant="meta" tone="alert">
              {t(PATROL_PROBLEM_LABEL[problem])}
            </Text>
          ))}
      </Stack>
    </Sheet>
  );
}
