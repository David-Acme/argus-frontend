import { useState } from 'react';
import type { CameraNoAimSector } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import type { CameraSettings } from '@/features/cameras/hooks/use-camera-settings';
import { NO_AIM_SECTOR_MAX, sectorRange } from '@/features/cameras/model/camera-aim';
import { ptzHoldRenewMs } from '@/features/cameras/model/camera-ptz';
import { SectorSheet } from '@/features/cameras/components/settings/sector-sheet';

export type PlacesSectionProps = { settings: CameraSettings };

export function PlacesSection({ settings }: PlacesSectionProps) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const { aim, camera, features } = settings;
  const sectors = aim.settings.noAimSectors;
  const full = sectors.length >= NO_AIM_SECTOR_MAX;
  const remove = (sector: CameraNoAimSector) =>
    void aim.update({ noAimSectors: sectors.filter((candidate) => candidate !== sector) });
  return (
    <>
      <Section title={t('screens.cameras.sight.sectors')}>
        {sectors.map((sector, index) => (
          <Row
            key={`${sector.name}-${index}`}
            leading={<Avatar icon="eyeoff" />}
            title={sector.name}
            meta={sectorRange(sector)}
            trailing={
              <Button
                iconOnly
                compact
                icon="x"
                label={t('screens.cameras.sight.sector-remove', { name: sector.name })}
                onPress={() => remove(sector)}
              />
            }
          />
        ))}
        {full ? (
          <Row title={t('screens.cameras.sight.sectors-full')} />
        ) : (
          <Row
            leading={<Avatar icon="plus" />}
            title={t('screens.cameras.sight.sector-add')}
            meta={t('screens.cameras.sight.sectors-hint')}
            chevron
            onPress={() => setAdding(true)}
          />
        )}
      </Section>
      {adding ? (
        <SectorSheet
          cameraId={camera.id}
          aim={aim}
          holdRenewMs={ptzHoldRenewMs(features)}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </>
  );
}
