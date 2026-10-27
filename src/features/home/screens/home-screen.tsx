import { useRouter } from 'expo-router';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { SurfaceGroup, SurfaceSlot, useSurfaces } from '@/shared/libs/surfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowLayout, useWindowWidth } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { InactiveRoleScreen } from '@/features/access';
import { PROFILE_HREF } from '@/features/home/constants/routes.constant';
import { useCommandLauncher } from '@/features/command';
import { InicioHero } from '@/features/home/components/hero/inicio-hero';
import { InicioLead } from '@/features/home/components/hero/inicio-lead';
import { useInicioHero, type InicioHero as Hero } from '@/features/home/hooks/use-inicio-hero';
import {
  useInicioBody,
  type InicioBody as InicioBodyData,
} from '@/features/home/hooks/use-inicio-body';
import {
  inicioColumns,
  inicioStack,
  LEAD,
  type InicioSignal,
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

function InicioBody({ hero, place, body }: BodyProps) {
  const { t } = useTranslation();
  const tablet = useWindowLayout().windowClass === 'medium';
  const surfaces = useSurfaces().inicio;
  const { step, sos } = body;
  const band = place !== 'hero';
  const signals = new Set<InicioSignal>(tablet ? [...body.signals, 'tablet'] : body.signals);
  const renders = new Map(surfaces.map((surface) => [surface.id, surface.render]));
  const render = (section: string) => {
    if (section === LEAD)
      return <InicioLead key={section} hero={hero} firstStep={step} sos={sos} band={band} />;
    const Section = renders.get(section);
    return Section ? (
      <SurfaceSlot key={section}>
        <Section />
      </SurfaceSlot>
    ) : null;
  };
  if (!band)
    return <SurfaceGroup>{inicioStack(surfaces, signals, step !== null).map(render)}</SurfaceGroup>;
  return (
    <SurfaceGroup>
      <ScreenColumns>
        {inicioColumns(place, surfaces, signals).map((column) => (
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
    </SurfaceGroup>
  );
}

function HomeContent() {
  const { t } = useTranslation();
  const { windowClass, navigation } = useWindowLayout();
  const router = useRouter();
  const width = useWindowWidth();
  const { open } = useCommandLauncher();
  const place = statPlace(windowClass, width);
  const band = place !== 'hero';
  const hero = useInicioHero(band);
  const body = useInicioBody();
  const search = (
    <>
      <Button
        iconOnly
        glass
        icon="search"
        iconSize="small"
        label={t('screens.home.inicio.search')}
        onPress={() => open()}
      />
      {navigation === 'bar' ? (
        <Button
          iconOnly
          glass
          icon="user"
          iconSize="small"
          label={t('screens.navigation.you')}
          onPress={() => router.push(PROFILE_HREF)}
        />
      ) : null}
    </>
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
