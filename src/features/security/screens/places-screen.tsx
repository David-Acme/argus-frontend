import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironmentCreate } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { EnvironmentFormDialog } from '@/features/security/components/environment-form-dialog';
import { PLACE_GLYPH } from '@/features/security/constants/security.constant';
import { useBack } from '@/features/security/hooks/use-back';
import { useGuard } from '@/features/security/hooks/use-guard';
import { camerasIn } from '@/features/security/model/environments';
import { placeMeta } from '@/features/security/model/places';

export default function PlacesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const back = useBack();
  const { guard: access } = useCapabilities();
  const guard = useGuard(access.review);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [creating, setCreating] = useState(false);
  const create = async (body: GuardEnvironmentCreate): Promise<boolean> => {
    const created = await guard.createEnvironment(body);
    if (created) router.push(`/security/${created.id}`);
    return created !== null;
  };
  const add = access.review ? (
    <Button
      iconOnly
      glass
      icon="plus"
      label={t('screens.security.places-screen.add')}
      onPress={() => setCreating(true)}
    />
  ) : undefined;
  return (
    <>
      <Screen title={t('screens.security.places-screen.title')} back={back} actions={add}>
        <Section>
          {guard.environments.map((environment) => (
            <Row
              key={environment.id}
              leading={<Avatar icon={PLACE_GLYPH[environment.kind]} />}
              title={environment.name}
              meta={placeMeta(
                environment,
                camerasIn(environment, guard.environments, cameras).length,
                t
              )}
              chevron
              onPress={() => router.push(`/security/${environment.id}`)}
            />
          ))}
        </Section>
      </Screen>
      {creating ? (
        <EnvironmentFormDialog open onOpenChange={setCreating} onSubmit={create} />
      ) : null}
    </>
  );
}
