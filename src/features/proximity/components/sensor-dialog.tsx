import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { MenuOption, ProximitySensorInput, ProximitySensorModel, ProximitySensorSource } from '@/core/types';
import { PROXIMITY_SENSOR_MODELS, PROXIMITY_SENSOR_SOURCES } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { LabelledInput } from '@/features/proximity/components/labelled-input';
import {
  parseOffset,
  parsePort,
  SENSOR_DEFAULT_PORTS,
  SENSOR_MODEL_LABEL,
  SENSOR_SOURCE_LABEL,
  sensorAims,
  sensorErrors,
  type ProximityFieldError,
} from '@/features/proximity/model/proximity';

type SensorDialogProps = {
  open: boolean;
  pending: boolean;
  cameras: readonly ICameraCacheRow[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ProximitySensorInput) => Promise<boolean>;
};

const NO_CAMERA = 'none';

export function SensorDialog({ open, pending, cameras, onOpenChange, onSubmit }: SensorDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [model, setModel] = useState<ProximitySensorModel>('ld2450');
  const [source, setSource] = useState<ProximitySensorSource>('esphome');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(String(SENSOR_DEFAULT_PORTS.esphome));
  const [entityId, setEntityId] = useState('');
  const [cameraId, setCameraId] = useState<string>(NO_CAMERA);
  const [offset, setOffset] = useState('');
  const [errors, setErrors] = useState<readonly ProximityFieldError[]>([]);
  const aims = sensorAims(model);

  const cameraOptions = useMemo<MenuOption[]>(
    () => [
      { value: NO_CAMERA, label: t('screens.proximity.sensors.no-camera') },
      ...cameras.map((camera) => ({ value: camera.id, label: camera.name })),
    ],
    [cameras, t]
  );
  const cameraLabel = cameraOptions.find((option) => option.value === cameraId)?.label;

  const errorOf = (field: ProximityFieldError) =>
    errors.includes(field) ? t(`screens.proximity.errors.${field}`) : null;

  const changeSource = (next: ProximitySensorSource) => {
    setSource(next);
    setPort(String(SENSOR_DEFAULT_PORTS[next]));
  };

  const submit = async () => {
    const pointed = aims && cameraId !== NO_CAMERA;
    const input: ProximitySensorInput = {
      name: name.trim(),
      room: room.trim(),
      model,
      source,
      host: host.trim(),
      port: parsePort(port),
      entityId: source === 'home_assistant' ? entityId.trim() : '',
      cameraId: pointed ? Number(cameraId) : null,
      panOffsetDeg: pointed ? parseOffset(offset) : null,
    };
    const found = sensorErrors(input);
    setErrors(found);
    if (found.length > 0) return;
    if (!(await onSubmit(input))) return;
    setName('');
    setRoom('');
    setHost('');
    setEntityId('');
    setOffset('');
    setCameraId(NO_CAMERA);
    onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.proximity.sensors.add-title')}
      description={t('screens.proximity.sensors.add-description')}
      closeLabel={t('common.close')}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="outline" disabled={pending} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={pending} onPress={() => void submit()}>
            <Text>{t('screens.proximity.sensors.add')}</Text>
          </Button>
        </>
      }>
      <View className="gap-4 pb-1">
        <LabelledInput label={t('screens.proximity.fields.name')} value={name} onChange={setName} error={errorOf('name')} />
        <LabelledInput
          label={t('screens.proximity.fields.room')}
          placeholder={t('screens.proximity.fields.room-placeholder')}
          value={room}
          onChange={setRoom}
          error={errorOf('room')}
        />
        <View className="gap-1.5">
          <Text variant="label">{t('screens.proximity.sensors.model-label')}</Text>
          <SegmentedControl
            options={PROXIMITY_SENSOR_MODELS.map((value) => ({ value, label: t(SENSOR_MODEL_LABEL[value]) }))}
            value={model}
            onChange={setModel}
            accessibilityLabel={t('screens.proximity.sensors.model-label')}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('screens.proximity.sensors.source-label')}</Text>
          <SegmentedControl
            options={PROXIMITY_SENSOR_SOURCES.map((value) => ({ value, label: t(SENSOR_SOURCE_LABEL[value]) }))}
            value={source}
            onChange={changeSource}
            accessibilityLabel={t('screens.proximity.sensors.source-label')}
          />
        </View>
        <LabelledInput label={t('screens.proximity.fields.host')} value={host} onChange={setHost} error={errorOf('host')} />
        <LabelledInput label={t('screens.proximity.fields.port')} value={port} onChange={setPort} error={errorOf('port')} numeric />
        {source === 'home_assistant' ? (
          <LabelledInput
            label={t('screens.proximity.fields.entity')}
            placeholder="binary_sensor.sala_presence"
            value={entityId}
            onChange={setEntityId}
            error={errorOf('entityId')}
          />
        ) : null}
        {aims ? (
          <View className="gap-1.5">
            <Text variant="label">{t('screens.proximity.sensors.camera-label')}</Text>
            <AdaptiveSelect
              options={cameraOptions}
              value={cameraId}
              onChange={setCameraId}
              title={t('screens.proximity.sensors.camera-label')}
              closeLabel={t('common.close')}
              searchPlaceholder={t('screens.proximity.sensors.camera-search')}
              emptyLabel={t('screens.proximity.sensors.no-camera')}
              trigger={<SelectField label={cameraLabel} />}
            />
            <Text variant="caption">{t('screens.proximity.sensors.camera-hint')}</Text>
          </View>
        ) : null}
        {aims && cameraId !== NO_CAMERA ? (
          <LabelledInput
            label={t('screens.proximity.fields.offset')}
            placeholder="0"
            value={offset}
            onChange={setOffset}
            error={errorOf('panOffsetDeg')}
            numeric
          />
        ) : null}
      </View>
    </AdaptiveDialog>
  );
}
