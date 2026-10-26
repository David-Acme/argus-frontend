import { useState } from 'react';
import type { GuardEnvironment } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Sheet, useOpenedOnce } from '@/shared/ui/sheet';
import { PLACE_GLYPH } from '@/features/security/constants';
import type { PlacePick } from '@/features/security/model/places';

type PlacePickerProps = {
  title: string;
  environments: readonly GuardEnvironment[];
  current: GuardEnvironment | null;
  onPick: (pick: PlacePick) => void;
};

export function PlacePicker({ title, environments, current, onPick }: PlacePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const mounted = useOpenedOnce(open);
  const choose = (pick: PlacePick) => {
    setOpen(false);
    onPick(pick);
  };
  const check = <Icon name="check" size="small" tone="accent" />;
  return (
    <>
      <Button
        glass
        compact
        label={title}
        trailing={{ icon: 'chevd' }}
        onPress={() => setOpen(true)}
      />
      {mounted ? (
        <Sheet
          variant="list"
          title={t('screens.security.places')}
          open={open}
          onClose={() => setOpen(false)}>
          {environments.map((environment) => (
            <Row
              key={environment.id}
              leading={<Avatar icon={PLACE_GLYPH[environment.kind]} />}
              title={environment.name}
              trailing={current?.id === environment.id ? check : undefined}
              onPress={() => choose(environment.id)}
            />
          ))}
          <Row
            leading={<Avatar icon="grid" />}
            title={t('screens.security.all-places')}
            trailing={current === null ? check : undefined}
            onPress={() => choose('all')}
          />
        </Sheet>
      ) : null}
    </>
  );
}
