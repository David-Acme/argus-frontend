import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { viewFor } from '@tests/support/access-fixtures';
import type { UserRole } from '@/core/types';
import type { AccessView } from '@/shared/libs/capabilities';
import type { ModuleSurfaces } from '@/shared/libs/surfaces';
import { screenFocus } from './screen-focus';
import './translation-stub';

const routes: string[] = [];

const saved = { bar: [] as string[], quick: [] as string[] };

const access: { view: AccessView; extra: readonly ModuleSurfaces[] } = {
  view: viewFor('owner'),
  extra: [],
};

const sheet = { open: true, full: false, log: [] as string[] };

const found = { results: true, footer: 'none' as 'none' | 'loading', pending: false };

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useRouter: () => ({
    navigate: (href: string) => routes.push(href),
    push: (href: string) => routes.push(href),
  }),
  useIsFocused: () => screenFocus.focused,
  useFocusEffect: () => undefined,
}));

mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: () => [],
  useViewCacheValue: () => null,
}));

mock.module('@/features/security', () => ({ useGuardHeadline: () => 'home' }));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useAccessView: () => access.view,
  useCapabilities: () => ({}),
}));

mock.module('@/features/navigation/hooks/use-nav-pins', () => ({
  useNavPins: () => ({
    ...saved,
    toggleBar: (module: string) => routes.push(`pin:${module}`),
    toggleQuick: (module: string) => routes.push(`quick:${module}`),
  }),
}));

mock.module('@/features/navigation/stores/all-sheet.store', () => ({
  useAllSheetOpen: () => sheet.open,
  useAllSheetFull: () => sheet.full,
  useAllSheetActions: () => ({
    show: (full?: boolean) => sheet.log.push(full ? 'show:full' : 'show'),
    expand: () => sheet.log.push('expand'),
    close: () => sheet.log.push('close'),
  }),
}));

mock.module('@/features/home', () => {
  const Section = () => null;
  return {
    NowSection: Section,
    ProjectsSection: Section,
    TodaySection: Section,
    TomorrowSection: Section,
    CamerasSection: Section,
    HappenedSection: Section,
    HomePeopleSection: Section,
    NewsSection: Section,
    HelpSection: Section,
    SystemSection: Section,
    WatchSection: Section,
    AttentionSection: Section,
    ModuleCards: Section,
  };
});

mock.module('@/features/command', () => ({
  useCommandSearch: ({ query }: { query: string }) => ({
    results:
      query && found.results
        ? [
            {
              title: 'Cámaras',
              items: [{ id: 'camera:3', label: 'Cocina', icon: 'cam', onRun: () => undefined }],
            },
          ]
        : [],
    paging: {
      footer: found.footer,
      loading: false,
      onEndReached: () => undefined,
      retry: () => undefined,
    },
    pending: found.pending,
  }),
}));
mock.module('@/features/cameras', () => ({
  RecentClipsCard: () => null,
  CameraAttention: () => null,
  SecurityCard: () => null,
  useCameraCounts: () => ({ online: 0, total: 0 }),
}));

const { AllSheet } = await import('@/features/navigation/components/all-sheet');
const { ModuleTile } = await import('@/features/navigation/components/module-tile');
const { ModuleShortcuts } = await import('@/features/home/components/hero/module-shortcuts');
const { APP_SURFACES } = await import('@/features/surfaces');
const { SurfaceProvider, useSurfaces } = await import('@/shared/libs/surfaces/surface-context');
const { SurfaceGroup, SurfaceSlot } = await import('@/shared/libs/surfaces/surface-slot');

const fakeModule = (index: number): ModuleSurfaces => ({
  module: `fake-${index}`,
  order: 100 + index,
  hub: { label: 'screens.navigation.modules', icon: 'grid', href: `/fake-${index}` },
  destinations: [
    {
      id: `fake-${index}`,
      href: `/fake-${index}`,
      icon: 'grid',
      label: 'screens.navigation.modules',
      order: 100 + index,
    },
  ],
});

const FAKES = Array.from({ length: 8 }, (_, index) => fakeModule(index));

function withFakes(view: AccessView): AccessView {
  return {
    ...view,
    activeModules: new Set([...view.activeModules, ...FAKES.map((module) => module.module)]),
  };
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <SurfaceProvider registry={[...APP_SURFACES, ...access.extra]}>{children}</SurfaceProvider>
  );
}

function mountSheet() {
  return render(
    <Shell>
      <AllSheet onArgus={() => sheet.log.push('argus')} />
    </Shell>
  );
}

const heading = (name: string) => screen.queryByRole('heading', { name });

afterEach(() => {
  routes.length = 0;
  sheet.log.length = 0;
  sheet.open = true;
  sheet.full = false;
  saved.bar = [];
  saved.quick = [];
  access.view = viewFor('owner');
  access.extra = [];
  found.results = true;
  found.footer = 'none';
  found.pending = false;
});

describe('the «Todo» sheet', () => {
  test('half height: the search field, the module grid and General; a tile opens its module', () => {
    mountSheet();
    expect(screen.getByPlaceholderText('Buscar en Argus')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Seguridad' }));
    expect(heading('Módulos')).not.toBeNull();
    expect(heading('General')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /^Ver los \d+ módulos$/ })).toBeNull();
    expect(sheet.log).toEqual(['close']);
    expect(routes).toEqual(['/security']);
  });

  test('typing searches inside the sheet: matching sections first, then the paged results', () => {
    mountSheet();
    fireEvent.change(screen.getByPlaceholderText('Buscar en Argus'), { target: { value: 'cli' } });
    expect(heading('Apartados')).not.toBeNull();
    expect(heading('Cámaras')).not.toBeNull();
    expect(heading('Módulos')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Clips/ }));
    expect(routes).toEqual(['/clips']);
  });

  test('a search that finds nothing offers no «Cargar más resultados», only the empty notice', () => {
    found.results = false;
    found.footer = 'loading';
    mountSheet();
    fireEvent.change(screen.getByPlaceholderText('Buscar en Argus'), { target: { value: 'zzz' } });
    expect(screen.queryByRole('button', { name: 'Cargar más resultados' })).toBeNull();
    expect(screen.getByText('Sin resultados para «zzz»')).toBeDefined();
  });

  test('while the search is still looking it shows neither the empty notice nor «Cargar más»', () => {
    found.results = false;
    found.footer = 'loading';
    found.pending = true;
    mountSheet();
    fireEvent.change(screen.getByPlaceholderText('Buscar en Argus'), { target: { value: 'zzz' } });
    expect(screen.queryByText('Sin resultados para «zzz»')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cargar más resultados' })).toBeNull();
  });

  test('full height: every module as a row that unfolds into its sections', () => {
    sheet.full = true;
    mountSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Ver los apartados de Seguridad' }));
    fireEvent.click(screen.getByRole('button', { name: /^Clips/ }));
    expect(routes).toEqual(['/clips']);
  });

  test('ten modules: the first eight in the grid and a way to see them all', () => {
    access.extra = FAKES;
    access.view = withFakes(viewFor('owner'));
    mountSheet();
    expect(screen.getAllByRole('button', { name: /^Abrir / }).length).toBe(8);
    fireEvent.click(screen.getByRole('button', { name: 'Ver los 10 módulos' }));
    expect(sheet.log).toEqual(['expand']);
  });

  const MATRIX: readonly { role: UserRole; modules: readonly string[]; roleActive?: boolean }[] = [
    { role: 'owner', modules: ['surveillance', 'productivity'] },
    { role: 'owner', modules: [] },
    { role: 'resident', modules: ['productivity'] },
    { role: 'guard', modules: ['surveillance'] },
    { role: 'guard', modules: ['productivity'] },
    { role: 'guest', modules: ['surveillance', 'productivity'] },
    { role: 'guest', modules: ['surveillance', 'productivity'], roleActive: false },
  ];

  for (const item of MATRIX)
    test(`${item.role} with ${item.modules.length} modules${item.roleActive === false ? ', inactive' : ''}: no empty group`, () => {
      access.view = viewFor(item.role, { modules: item.modules, roleActive: item.roleActive });
      for (const full of [false, true]) {
        sheet.full = full;
        const view = mountSheet();
        const modules = screen.queryAllByRole('button', { name: /^(Abrir|Ver los apartados de) / });
        if (heading('Módulos')) expect(modules.length).toBeGreaterThan(0);
        else expect(modules.length).toBe(0);
        expect(heading('General')).not.toBeNull();
        expect(screen.getByRole('button', { name: /^Tú/ })).toBeDefined();
        view.unmount();
      }
    });
});

describe('a module tile', () => {
  test('a tap opens it and a long press offers to pin it', () => {
    const opened: string[] = [];
    render(
      <ModuleTile
        entry={{
          key: 'module:surveillance',
          href: '/security',
          icon: 'shield',
          label: 'screens.navigation.security',
        }}
        onOpen={(entry) => opened.push(entry.href)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Seguridad' }));
    expect(opened).toEqual(['/security']);
  });
});

describe('the quick access row on Inicio', () => {
  test('the active modules and «Añadir», which opens the full sheet', () => {
    render(
      <Shell>
        <ModuleShortcuts />
      </Shell>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Agenda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Añadir' }));
    expect(routes).toEqual(['/agenda']);
    expect(sheet.log).toEqual(['show:full']);
  });

  test('a role with no module gets no row at all', () => {
    access.view = viewFor('guest');
    const { container } = render(
      <Shell>
        <ModuleShortcuts />
      </Shell>
    );
    expect(container.textContent).toBe('');
  });
});

describe('the surface primitives', () => {
  function Names() {
    return (
      <>
        {useSurfaces()
          .modules.map((module) => module.module)
          .join(',')}
      </>
    );
  }

  test('the provider resolves the live view, and a slot renders its section', () => {
    const { container, rerender } = render(
      <Shell>
        <Names />
      </Shell>
    );
    expect(container.textContent).toBe('surveillance,productivity');
    access.view = viewFor('owner', { modules: ['productivity'] });
    rerender(
      <Shell>
        <Names />
      </Shell>
    );
    expect(container.textContent).toBe('productivity');
    const slot = render(
      <SurfaceGroup>
        <SurfaceSlot>
          <span>section</span>
        </SurfaceSlot>
      </SurfaceGroup>
    );
    expect(slot.getByText('section')).toBeDefined();
  });

  test('without a provider nothing is offered', () => {
    const { container } = render(<Names />);
    expect(container.textContent).toBe('');
  });
});
