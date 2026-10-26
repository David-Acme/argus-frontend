import { useState } from 'react';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { EpisodeSheet } from '@/features/security/components/page/episode-sheet';
import { HappenedSection } from '@/features/security/components/page/happened-section';
import { useBack } from '@/features/security/hooks/use-back';
import { useEpisodes } from '@/features/security/hooks/use-episodes';
import { episodeKey } from '@/features/security/model/episode';

export default function EpisodesScreen() {
  const { t } = useTranslation();
  const back = useBack();
  const { guard } = useCapabilities();
  const episodes = useEpisodes(undefined, guard.view);
  const [refreshing, setRefreshing] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const opened = episodes.rows.find((row) => episodeKey(row) === openKey) ?? null;
  const refresh = async () => {
    setRefreshing(true);
    await episodes.reload();
    setRefreshing(false);
  };
  return (
    <>
      <Screen
        title={t('screens.security.happened.title')}
        back={back}
        refresh={{ refreshing, onRefresh: () => void refresh() }}>
        <HappenedSection
          feed={episodes}
          feedForm
          bare
          onOpen={(episode) => setOpenKey(episodeKey(episode))}
        />
        {episodes.hasMore ? (
          <Section variant="plain">
            <Button block label={t('screens.security.happened.more')} onPress={episodes.loadMore} />
          </Section>
        ) : null}
      </Screen>
      <EpisodeSheet
        episode={opened}
        where={opened?.cameraName ?? ''}
        actions={episodes}
        onClose={() => setOpenKey(null)}
      />
    </>
  );
}
