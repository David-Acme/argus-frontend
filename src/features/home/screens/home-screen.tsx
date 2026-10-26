import type { ComponentType } from 'react';
import { CAPABILITY } from '@/shared/constants';
import { useAccessView, useCapabilities } from '@/shared/hooks/use-capabilities';
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
import { UpcomingRemindersSection } from '@/features/home/components/agenda/upcoming-reminders-section';
import { CamerasSection } from '@/features/home/components/cameras/cameras-section';
import { HappenedSection } from '@/features/home/components/cameras/happened-section';
import { RecentClipsSection } from '@/features/home/components/cameras/recent-clips-section';
import { HomePeopleSection } from '@/features/home/components/feed/home-people-section';
import { NewsSection } from '@/features/home/components/feed/news-section';
import { InicioHero } from '@/features/home/components/hero/inicio-hero';
import { InicioLead } from '@/features/home/components/hero/inicio-lead';
import { useInicioHero, type InicioHero as Hero } from '@/features/home/hooks/use-inicio-hero';
import { useInicioSummary } from '@/features/home/hooks/use-inicio-stats';
import {
  inicioColumns,
  inicioStack,
  type InicioReads,
  type InicioSection,
} from '@/features/home/model/inicio-layout';
import { firstStep, sosOnInicio } from '@/features/home/model/inicio-states';
import { statPlace, type StatPlace } from '@/features/home/model/inicio-stats';

type BodyProps = { hero: Hero; place: StatPlace };

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
  reminders: UpcomingRemindersSection,
};

function useInicioBody() {
  const { has, can, guard } = useCapabilities();
  const summary = useInicioSummary();
  const reads: InicioReads = {
    agenda: has(CAPABILITY.remindersRead) || has(CAPABILITY.agendaRead),
    news: has(CAPABILITY.notificationsRead),
    cameras: has(CAPABILITY.cameraView),
    people: has(CAPABILITY.presenceRead),
  };
  const step = firstStep({
    summary,
    addsCameras: can('camera', 'create'),
    addsReminders: has(CAPABILITY.remindersWrite),
  });
  const sos = sosOnInicio({ panics: has(CAPABILITY.safetyPanic), hasSecurityTab: guard.view });
  return { reads, step, sos };
}

const COLUMN_KEYS = {
  agenda: 'screens.home.inicio.columns.agenda',
  news: 'screens.home.inicio.columns.news',
  cameras: 'screens.home.inicio.columns.cameras',
  side: 'screens.home.inicio.columns.side',
  lead: 'screens.home.inicio.columns.lead',
} as const;

function InicioBody({ hero, place }: BodyProps) {
  const { t } = useTranslation();
  const { reads, step, sos } = useInicioBody();
  const band = place !== 'hero';
  const render = (section: InicioSection) => {
    if (section === 'lead')
      return <InicioLead key={section} hero={hero} firstStep={step} sos={sos} band={band} />;
    const Section = SECTIONS[section];
    return <Section key={section} />;
  };
  if (!band) return <>{inicioStack(reads, step !== null).map(render)}</>;
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
      <InicioHero hero={hero} place={place} />
      <InicioBody hero={hero} place={place} />
    </Screen>
  );
}

export default function HomeScreen() {
  const view = useAccessView();
  return view.roleActive ? <HomeContent /> : <InactiveRoleScreen />;
}
