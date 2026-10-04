import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment, GuardEpisode } from '@/core/types';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { Panel } from '@/shared/components/ui/panel';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { EnvironmentCard } from '@/features/security/components/environment-card';
import { camerasIn } from '@/features/security/model/environments';
import { useTranslation } from '@/shared/hooks/use-translation';

type EnvironmentsPanelProps = {
  environments: readonly GuardEnvironment[];
  cameras: readonly ICameraCacheRow[];
  episodes: readonly GuardEpisode[];
  onOpen: (environment: GuardEnvironment) => void;
  onCreate?: () => void;
  className?: string;
};

type GridItem = GuardEnvironment | typeof CREATE;

const CREATE = 'create';
const GRID_GAP = 12;
const TWO_COLUMNS_FROM = 520;

const columnsFor = (width: number) => (width >= TWO_COLUMNS_FROM ? 2 : 1);

export function EnvironmentsPanel({
  environments,
  cameras,
  episodes,
  onOpen,
  onCreate,
  className,
}: EnvironmentsPanelProps) {
  const { t } = useTranslation();

  const ongoing = (environment: GuardEnvironment) =>
    episodes.filter((episode) => episode.state === 'active' && episode.environmentId === environment.id).length;

  const items: readonly GridItem[] = onCreate ? [...environments, CREATE] : environments;

  return (
    <Panel
      title={t('screens.security.environments.title')}
      description={t('screens.security.environments.description')}
      count={environments.length}
      className={className}>
      <ResponsiveGrid
        id="security-environments"
        items={items}
        keyOf={(item) => (item === CREATE ? CREATE : String(item.id))}
        columnsFor={columnsFor}
        gap={GRID_GAP}
        renderItem={(item) =>
          item === CREATE ? (
            <View className="min-h-[168px] flex-1">
              <CreateTile
                layout="fill"
                label={t('screens.security.environments.add')}
                hint={t('screens.security.environments.add-hint')}
                onPress={() => onCreate?.()}
              />
            </View>
          ) : (
            <EnvironmentCard
              environment={item}
              cameras={camerasIn(item, environments, cameras)}
              ongoing={ongoing(item)}
              onOpen={onOpen}
            />
          )
        }
      />
    </Panel>
  );
}
