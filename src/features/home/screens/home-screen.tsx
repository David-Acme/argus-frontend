import type { ComponentType } from 'react';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowLayout, useWindowWidth } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { InactiveRoleScreen } from '@/features/access';
import { useCommandLauncher } from '@/features/command';
import { NowSection } from '@/features/home/components/agenda/now-section';
import { ProjectsSection } from '@/features/home/components/agenda/projects-section';
import { TodaySection } from '@/features/home/components/agenda/today-section';
import { TomorrowSection } from '@/features/home/components/agenda/tomorrow-section';
import { CamerasSection } from '@/features/home/components/cameras/cameras-section';
import { HappenedSection } from '@/features/home/components/cameras/happened-section';
import { RecentClipsSection } from '@/features/home/components/cameras/recent-clips-section';
import { HomePeopleSection } from '@/features/home/components/feed/home-people-section';
import { NewsSection } from '@/features/home/components/feed/news-section';
import { InicioHero } from '@/features/home/components/hero/inicio-hero';
import { InicioLead } from '@/features/home/components/hero/inicio-lead';
import { HelpSection } from '@/features/home/components/status/help-section';
import { SystemSection } from '@/features/home/components/status/system-section';
import { WatchSection } from '@/features/home/components/status/watch-section';
import { useInicioHero, type InicioHero as Hero } from '@/features/home/hooks/use-inicio-hero';
import {
  useInicioBody,
  type InicioBody as InicioBodyData,
} from '@/features/home/hooks/use-inicio-body';
import {
  inicioColumns,
  inicioStack,
  type InicioSection,
} from '@/features/home/model/inicio-layout';
import { statPlace, type StatPlace } from '@/features/home/model/inicio-stats';

type BodyProps = { hero: Hero; place: StatPlace; body: InicioBodyData };

const COLUMN_KEYS = {
  agenda: 'screens.home.inicio.columns.agenda',
  news: 'screens.home.inicio.columns.news',
  cameras: 'screens.home.inicio.columns.cameras',
  side: 'screens.home.inicio.columns.side',
  lead: 'screens.home.inicio.columns.lead',
} as const;

const SECTIONS: Record<Exclude<InicioSection, 'lead'>, ComponentType> = {
  now: NowSection,
  today: TodaySection,
  tomorrow: TomorrowSection,
  news: NewsSection,
  cameras: CamerasSection,
  happened: HappenedSection,
  people: HomePeopleSection,
  projects: ProjectsSection,
  clips: RecentClipsSection,
  watch: WatchSection,
  system: SystemSection,
  help: HelpSection,
};

function InicioBody({ hero, place, body }: BodyProps) {
  const { t } = useTranslation();
  const tablet = useWindowLayout().windowClass === 'medium';
  const { reads, step, sos } = body;
  const band = place !== 'hero';
  const render = (section: InicioSection) => {
    if (section === 'lead')
      return <InicioLead key={section} hero={hero} firstStep={step} sos={sos} band={band} />;
    const Section = SECTIONS[section];
    return <Section key={section} />;
  };
  if (!band) return <>{inicioStack(reads, step !== null, tablet).map(render)}</>;
  return (
    <ScreenColumns>
      {inicioColumns(place, reads).map((column) => (
        <ScreenColumn
          key={column.id}
          label={t(COLUMN_KEYS[column.id])}
          width={column.width}
          max={column.max}
          grows={column.grows}>
          {column.sections.map(render)}
        </ScreenColumn>
      ))}
    </ScreenColumns>
  );
}

function HomeContent() {
  const { t } = useTranslation();
  const { windowClass } = useWindowLayout();
  const width = useWindowWidth();
  const { open } = useCommandLauncher();
  const place = statPlace(windowClass, width);
  const band = place !== 'hero';
  const hero = useInicioHero(band);
  const body = useInicioBody();
  const search = (
    <Button
      iconOnly
      glass
      icon="search"
      iconSize="small"
      label={t('screens.home.inicio.search')}
      onPress={() => open()}
    />
  );
  return (
    <Screen
      columns
      aura={band ? undefined : hero.aura}
      meta={band ? undefined : hero.greeting}
      actions={band ? undefined : search}>
      <InicioHero hero={hero} place={place} bare={body.step !== null} />
      <InicioBody hero={hero} place={place} body={body} />
    </Screen>
  );
}

export default function HomeScreen() {
  const view = useAccessView();
  return view.roleActive ? <HomeContent /> : <InactiveRoleScreen />;
}
