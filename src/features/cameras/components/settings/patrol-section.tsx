import { useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import {
  PATROL_MIN_STOPS,
  formatPatrolHour,
  stopName,
} from '@/features/cameras/model/camera-patrol';
import { PatrolSheet } from '@/features/cameras/components/settings/patrol-sheet';

export type PatrolSectionProps = { settings: CameraSettings };

function usePatrolLines(settings: CameraSettings) {
  const { t } = useTranslation();
  const { patrol } = settings.patrol;
  if (!patrol) return null;
  const unnamed = t('screens.cameras.patrol.unnamed-stop');
  const window = patrol.window
    ? t('screens.cameras.patrol.window-between', {
        start: formatPatrolHour(patrol.window.startHour),
        end: formatPatrolHour(patrol.window.endHour),
      })
    : t('screens.cameras.patrol.window-all-day');
  return {
    route: patrol.stops
      .map((stop) => stopName(stop, settings.presets.presets, unnamed))
      .join(' → '),
    detail: [
      t('screens.cameras.patrol.dwell-summary', { seconds: String(patrol.dwellSeconds) }),
      window,
    ].join(' · '),
  };
}

export function PatrolSection({ settings }: PatrolSectionProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { patrol, save, remove, loaded, failed } = settings.patrol;
  const presets = settings.presets.presets;
  const lines = usePatrolLines(settings);
  const creatable = loaded && presets.length >= PATROL_MIN_STOPS;
  return (
    <>
      <Section title={t('screens.cameras.patrol.title')}>
        {patrol && lines ? (
          <Row
            leading={<Avatar icon="repeat" />}
            title={lines.route}
            meta={lines.detail}
            chevron
            onPress={() => setEditing(true)}
          />
        ) : (
          <Row
            leading={<Avatar icon="repeat" />}
            title={
              creatable ? t('screens.cameras.patrol.create') : t('screens.cameras.patrol.empty')
            }
            meta={
              failed
                ? t('screens.cameras.patrol.load-failed')
                : creatable
                  ? t('screens.cameras.patrol.description')
                  : t('screens.cameras.patrol.needs-presets')
            }
            chevron={creatable}
            onPress={creatable ? () => setEditing(true) : undefined}
          />
        )}
        {patrol ? (
          <Row
            title={t('screens.cameras.patrol.enabled')}
            meta={t('screens.cameras.patrol.enabled-hint')}
            trailing={
              <Switch
                value={patrol.enabled}
                label={t('screens.cameras.patrol.enabled')}
                onValueChange={(enabled) => void save({ enabled })}
              />
            }
          />
        ) : null}
        {patrol ? (
          <Row title={t('screens.cameras.patrol.remove')} danger onPress={() => void remove()} />
        ) : null}
      </Section>
      {editing ? (
        <PatrolSheet
          patrol={patrol}
          presets={presets}
          onClose={() => setEditing(false)}
          onSave={save}
        />
      ) : null}
    </>
  );
}
