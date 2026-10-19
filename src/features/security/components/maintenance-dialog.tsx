import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment, MaintenanceDeclare } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import {
  MAINTENANCE_DEFAULT_MINUTES,
  MAINTENANCE_MINUTES,
  declareBody,
  type MaintenanceScope,
} from '@/features/security/model/maintenance';

type ScopeKind = 'this' | 'several' | 'environment';

type MaintenanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameras: readonly ICameraCacheRow[];
  environments: readonly GuardEnvironment[];
  cameraId?: number;
  onSubmit: (body: MaintenanceDeclare) => Promise<boolean>;
};

type PickRowProps = {
  label: string;
  selected: boolean;
  role: 'checkbox' | 'radio';
  onPress: () => void;
};

function PickRow({ label, selected, role, onPress }: PickRowProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'min-h-11 flex-row items-center gap-3 rounded-xl px-3 active:opacity-70',
        selected ? 'bg-accent-soft' : 'bg-surface-secondary',
      )}>
      <Icon
        name={selected ? 'check-circle' : 'circle'}
        className={cn('size-5', selected ? 'text-accent-strong' : 'text-muted-foreground')}
      />
      <Text variant="body" numberOfLines={1} className="min-w-0 flex-1">
        {label}
      </Text>
    </Pressable>
  );
}

export function MaintenanceDialog({ open, onOpenChange, cameras, environments, cameraId, onSubmit }: MaintenanceDialogProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ScopeKind>(cameraId === undefined ? 'several' : 'this');
  const [picked, setPicked] = useState<readonly number[]>(cameraId === undefined ? [] : [cameraId]);
  const [environmentId, setEnvironmentId] = useState<number>(
    environments.find((environment) => cameraId !== undefined && environment.cameraIds.includes(cameraId))?.id ??
      environments[0]?.id ??
      0,
  );
  const [minutes, setMinutes] = useState(String(MAINTENANCE_DEFAULT_MINUTES));
  const [saving, setSaving] = useState(false);
  const kindOptions = useMemo(
    () => [
      ...(cameraId === undefined ? [] : [{ value: 'this' as const, label: t('screens.security.maintenance.scope-this') }]),
      { value: 'several' as const, label: t('screens.security.maintenance.scope-several') },
      ...(environments.length > 0
        ? [{ value: 'environment' as const, label: t('screens.security.maintenance.scope-environment') }]
        : []),
    ],
    [cameraId, environments.length, t],
  );
  const minuteOptions = useMemo(
    () =>
      MAINTENANCE_MINUTES.map((value) => ({
        value: String(value),
        label:
          value < 60
            ? t('screens.security.maintenance.minutes', { minutes: String(value) })
            : t('screens.security.maintenance.hours', { hours: String(value / 60) }),
      })),
    [t],
  );
  const scope: MaintenanceScope =
    kind === 'environment'
      ? { kind: 'environment', environmentId }
      : { kind: 'cameras', cameraIds: kind === 'this' && cameraId !== undefined ? [cameraId] : picked };
  const body = declareBody(scope, Number(minutes));

  const toggle = (id: number) =>
    setPicked((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const submit = async () => {
    if (!body || saving) return;
    setSaving(true);
    const saved = await onSubmit(body);
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.security.maintenance.declare')}
      description={t('screens.security.maintenance.declare-description')}
      closeLabel={t('common.close')}
      onSubmit={() => void submit()}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button disabled={!body} loading={saving} onPress={() => void submit()}>
            <Text>{t('screens.security.maintenance.start')}</Text>
          </Button>
        </>
      }>
      <View className="gap-4">
        <SegmentedControl
          accessibilityLabel={t('screens.security.maintenance.scope')}
          value={kind}
          onChange={setKind}
          options={kindOptions}
        />
        {kind === 'several' ? (
          <View className="gap-2">
            {cameras.map((camera) => (
              <PickRow
                key={camera.id}
                role="checkbox"
                label={camera.name}
                selected={picked.includes(Number(camera.id))}
                onPress={() => toggle(Number(camera.id))}
              />
            ))}
          </View>
        ) : null}
        {kind === 'environment' ? (
          <View accessibilityRole="radiogroup" className="gap-2">
            {environments.map((environment) => (
              <PickRow
                key={environment.id}
                role="radio"
                label={environment.name}
                selected={environment.id === environmentId}
                onPress={() => setEnvironmentId(environment.id)}
              />
            ))}
          </View>
        ) : null}
        <View className="gap-2">
          <Text variant="label">{t('screens.security.maintenance.duration')}</Text>
          <SegmentedControl
            accessibilityLabel={t('screens.security.maintenance.duration')}
            value={minutes}
            onChange={setMinutes}
            options={minuteOptions}
          />
        </View>
        <Text variant="caption">{t('screens.security.maintenance.declare-hint')}</Text>
      </View>
    </AdaptiveDialog>
  );
}
