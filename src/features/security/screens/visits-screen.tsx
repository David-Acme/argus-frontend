import { useState } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { ExpectedGuestForm } from '@/features/security/components/expected-guest-form';
import { useBack } from '@/features/security/hooks/use-back';
import { useExpectedGuests } from '@/features/security/hooks/use-expected-guests';
import { useGuardEnvironments } from '@/features/security/hooks/use-guard';
import { useMomentFormat } from '@/features/security/hooks/use-moment-format';
import { visitMeta } from '@/features/security/model/visits';

const MINUTE_MS = 60_000;

export default function VisitsScreen() {
  const { t } = useTranslation();
  const back = useBack();
  const format = useMomentFormat();
  const now = useNow(MINUTE_MS);
  const { guard: access, isOwner } = useCapabilities();
  const guests = useExpectedGuests();
  const environments = useGuardEnvironments(access.view).data ?? [];
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [adding, setAdding] = useState(false);
  const add = { label: t('screens.security.guests.add'), onPress: () => setAdding(true) };
  const empty = access.manageGuests ? (
    <Empty
      message={t('screens.security.guests.empty')}
      detail={t('screens.security.guests.empty-hint')}
      icon="door"
      action={add}
    />
  ) : (
    <Notice icon="door" title={t('screens.security.guests.empty')} />
  );
  return (
    <>
      <Screen
        title={t('screens.security.guests.title')}
        back={back}
        actions={
          access.manageGuests ? (
            <Button iconOnly glass icon="plus" label={add.label} onPress={add.onPress} />
          ) : undefined
        }>
        {guests.list.length === 0 ? (
          <Section variant="plain">{empty}</Section>
        ) : (
          <Section>
            {guests.list.map((guest) => (
              <Row
                key={guest.id}
                leading={<Avatar icon="door" />}
                title={guest.description}
                meta={[
                  visitMeta(guest, now, format),
                  guest.oneTime ? t('screens.security.guests.once') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                trailing={
                  access.manageGuests ? (
                    <Button
                      iconOnly
                      icon="x"
                      label={t('screens.security.visits-screen.remove-label', {
                        name: guest.description,
                      })}
                      onPress={() => guests.remove(guest)}
                    />
                  ) : undefined
                }
              />
            ))}
          </Section>
        )}
      </Screen>
      {adding ? (
        <ExpectedGuestForm
          open
          onOpenChange={setAdding}
          onSubmit={guests.add}
          environments={environments}
          cameras={cameras}
          arrivalRequired={!isOwner}
        />
      ) : null}
    </>
  );
}
