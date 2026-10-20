import { useState } from 'react';
import { View } from 'react-native';
import type { CameraPatrol, IconName } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { CameraPatrolDialog } from '@/features/cameras/components/camera-patrol-dialog';
import type { CameraPatrolControls } from '@/features/cameras/hooks/use-camera-patrol';
import type { CameraPreset } from '@/features/cameras/model/camera-presets';
import { PATROL_MIN_STOPS, formatPatrolHour, stopName } from '@/features/cameras/model/camera-patrol';

type CameraPatrolPanelProps = {
  controls: CameraPatrolControls;
  presets: readonly CameraPreset[];
  className?: string;
};

type PatrolRuleProps = {
  icon: IconName;
  text: string;
};

type PatrolSummaryProps = {
  patrol: CameraPatrol;
  presets: readonly CameraPreset[];
};

function PatrolRule({ icon, text }: PatrolRuleProps) {
  return (
    <View className="flex-row items-start gap-2">
      <Icon name={icon} className="text-foreground-secondary mt-0.5 size-4" />
      <Text variant="caption" className="text-foreground-secondary min-w-0 flex-1">
        {text}
      </Text>
    </View>
  );
}

function PatrolSummary({ patrol, presets }: PatrolSummaryProps) {
  const { t } = useTranslation();
  const unnamed = t('screens.cameras.patrol.unnamed-stop');
  const route = patrol.stops.map((stop) => stopName(stop, presets, unnamed)).join(' → ');
  const window = patrol.window
    ? t('screens.cameras.patrol.window-between', {
        start: formatPatrolHour(patrol.window.startHour),
        end: formatPatrolHour(patrol.window.endHour),
      })
    : t('screens.cameras.patrol.window-all-day');

  return (
    <View className="gap-1.5">
      <Text variant="body">{route}</Text>
      <Text variant="caption">
        {[t('screens.cameras.patrol.dwell-summary', { seconds: String(patrol.dwellSeconds) }), window].join(' · ')}
      </Text>
    </View>
  );
}

export function CameraPatrolPanel({ controls, presets, className }: CameraPatrolPanelProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { patrol, save, remove } = controls;
  const enoughPresets = presets.length >= PATROL_MIN_STOPS;

  const openEditor = () => setEditing(true);

  return (
    <>
      <Panel
        title={t('screens.cameras.patrol.title')}
        description={t('screens.cameras.patrol.description')}
        action={
          patrol ? (
            <Button size="sm" variant="outline" onPress={openEditor}>
              <Text>{t('common.edit')}</Text>
            </Button>
          ) : null
        }
        className={cn('gap-3', className)}>
        <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl px-3 py-3">
          <PatrolRule icon="shield" text={t('screens.cameras.patrol.rule-away')} />
          <PatrolRule icon="hand" text={t('screens.cameras.patrol.rule-person')} />
        </View>
        {patrol ? (
          <>
            <PatrolSummary patrol={patrol} presets={presets} />
            <ToggleRow
              label={t('screens.cameras.patrol.enabled')}
              hint={t('screens.cameras.patrol.enabled-hint')}
              value={patrol.enabled}
              onChange={(enabled) => void save({ enabled })}
            />
            <View className="flex-row justify-end">
              <Button size="sm" variant="ghost" onPress={() => void remove()}>
                <Icon name="trash" className="text-error-strong size-4" />
                <Text className="text-error-strong">{t('screens.cameras.patrol.remove')}</Text>
              </Button>
            </View>
          </>
        ) : (
          <View className="gap-2">
            <Text variant="caption">
              {controls.failed ? t('screens.cameras.patrol.load-failed') : t('screens.cameras.patrol.empty')}
            </Text>
            {enoughPresets ? null : <Text variant="caption">{t('screens.cameras.patrol.needs-presets')}</Text>}
            <View className="flex-row">
              <Button size="sm" disabled={!enoughPresets || !controls.loaded} onPress={openEditor}>
                <Icon name="plus" className="text-foreground-on-interactive size-4" />
                <Text>{t('screens.cameras.patrol.create')}</Text>
              </Button>
            </View>
          </View>
        )}
      </Panel>
      {editing ? (
        <CameraPatrolDialog open patrol={patrol} presets={presets} onOpenChange={setEditing} onSave={save} />
      ) : null}
    </>
  );
}
