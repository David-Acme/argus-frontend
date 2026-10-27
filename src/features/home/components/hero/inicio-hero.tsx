import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useHeightLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Presence } from '@/shared/ui/presence';
import { Skeleton } from '@/shared/ui/resource-view';
import { heroStepOf, Status } from '@/shared/ui/status';
import { useCommandLauncher } from '@/features/command';
import type { InicioHero as Hero } from '@/features/home/hooks/use-inicio-hero';
import { useInicioStats } from '@/features/home/hooks/use-inicio-stats';
import type { StatPlace } from '@/features/home/model/inicio-stats';
import { OfflineNotice } from './inicio-lead';

export type InicioHeroProps = { hero: Hero; place: StatPlace; bare?: boolean };

type NewButtonProps = { onPress: () => void };

const PILLS = ['cameras', 'alerts', 'detections'] as const;

function NewButton({ onPress }: NewButtonProps) {
  const { t } = useTranslation();
  return (
    <Button
      variant="primary"
      compact
      icon="plus"
      label={t('screens.home.inicio.new')}
      trailing={{ key: 'N' }}
      onPress={onPress}
    />
  );
}

function HeroSkeleton() {
  const { t } = useTranslation();
  const step = heroStepOf({ wide: false, height: useHeightLayout() });
  return (
    <View role="progressbar" aria-label={t('screens.home.inicio.loading')}>
      <View className="gap-status-hero-gap px-status-hero-pad pt-status-hero-pad flex-row items-center">
        <Presence state="idle" size={step.presence} />
        <View className="gap-skeleton-line-gap min-w-0 flex-1">
          <Skeleton shape="title" />
          <Skeleton shape="meta" />
        </View>
      </View>
      <View className="mt-status-stats-top flex-row gap-2">
        {PILLS.map((pill) => (
          <Skeleton key={pill} shape="pill" />
        ))}
      </View>
    </View>
  );
}

export function InicioHero({ hero, place, bare = false }: InicioHeroProps) {
  const stats = useInicioStats(place);
  const { openNew } = useCommandLauncher();
  const band = place !== 'hero';
  const loading = hero.phase === 'loading';
  if (loading && !band) return <HeroSkeleton />;
  const status = (
    <Status
      tone={hero.tone}
      sentence={loading ? hero.greeting : hero.sentence}
      meta={loading ? '' : hero.meta}
      stats={loading || bare ? [] : stats}
      presence={hero.presence}
      aura={hero.aura}
      action={band ? <NewButton onPress={openNew} /> : undefined}
    />
  );
  if (band) return status;
  return (
    <>
      <OfflineNotice age={hero.offlineAge} />
      {status}
    </>
  );
}
