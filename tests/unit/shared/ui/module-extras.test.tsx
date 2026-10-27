import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { viewFor } from '@tests/support/access-fixtures';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { AttentionItem, ModuleSurfaces } from '@/shared/libs/surfaces';
import { screenFocus } from './screen-focus';
import './translation-stub';

const routes: string[] = [];

const sheet: string[] = [];

const cache: { cameras: Partial<ICameraCacheRow>[]; prefs: unknown; summary: unknown } = {
  cameras: [],
  prefs: null,
  summary: null,
};

const saved: unknown[] = [];

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useRouter: () => ({ push: (href: string) => routes.push(href) }),
  useIsFocused: () => screenFocus.focused,
  useFocusEffect: () => undefined,
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useAccessView: () => viewFor('owner'),
  useCapabilities: () => ({}),
}));

mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: () => cache.cameras,
  useViewCacheValue: (key: string) =>
    key === 'inicio.prefs' ? cache.prefs : key === 'dashboard.summary' ? cache.summary : null,
}));

mock.module('@/core/services/view-cache.service', () => ({
  viewCacheService: { writeValue: (_key: string, value: unknown) => saved.push(value) },
}));

mock.module('@/features/navigation', () => ({
  useAllSheetActions: () => ({ show: (full?: boolean) => sheet.push(full ? 'full' : 'half') }),
}));

const { AttentionSection } = await import('@/features/home/components/status/attention-section');
const { ModuleCards } = await import('@/features/home/components/status/module-cards');
const { CustomizeSheet } = await import('@/features/home/components/status/customize-sheet');
const { CameraAttention } = await import('@/features/surfaces/components/camera-attention');
const { SecurityCard } = await import('@/features/surfaces/components/security-card');
const { AgendaCard } = await import('@/features/surfaces/components/agenda-card');
const { AttentionProbes } = await import('@/shared/libs/surfaces/attention-probes');
const { attentionStore } = await import('@/shared/libs/surfaces/attention-store');
const { SurfaceProvider } = await import('@/shared/libs/surfaces/surface-context');

const ITEM: AttentionItem = {
  id: 'camera-offline:1',
  title: 'Cocina no responde',
  meta: 'Revisa que esté encendida y en tu Wi-Fi.',
  icon: 'wifioff',
  href: '/cameras/1',
};

const Card = (name: string) =>
  function ModuleCard() {
    return <span>{`card ${name}`}</span>;
  };

const moduleOf = (module: string, order: number): ModuleSurfaces => ({
  module,
  order,
  hub: { label: 'screens.navigation.modules', icon: 'grid', href: `/${module}` },
  card: Card(module),
});

const REGISTRY: readonly ModuleSurfaces[] = [
  { ...moduleOf('surveillance', 10) },
  { ...moduleOf('productivity', 20) },
];

afterEach(() => {
  routes.length = 0;
  sheet.length = 0;
  saved.length = 0;
  cache.cameras = [];
  cache.prefs = null;
  cache.summary = null;
  attentionStore.drop('test');
  attentionStore.drop('camera-offline');
});

describe('Atención', () => {
  test('absent while nothing needs attention, then one row per alert that opens its place', () => {
    const { container } = render(<AttentionSection />);
    expect(container.textContent).toBe('');
    act(() => attentionStore.report('test', 'surveillance', [ITEM]));
    expect(screen.getByRole('heading', { name: 'Atención' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Cocina no responde/ }));
    expect(routes).toEqual(['/cameras/1']);
  });

  test('a probe reports what its module sees, and leaves nothing behind when it goes', () => {
    cache.cameras = [{ id: '1', name: 'Cocina', isEnabled: true, isOnline: false }];
    const reported: AttentionItem[][] = [];
    render(<CameraAttention report={(items) => reported.push([...items])} />);
    expect(reported.at(-1)?.map((item) => item.href)).toEqual(['/cameras/1']);
    const shell = render(
      <SurfaceProvider
        registry={[
          {
            module: 'surveillance',
            order: 10,
            attention: [{ id: 'camera-offline', probe: CameraAttention }],
          },
        ]}>
        <AttentionProbes />
      </SurfaceProvider>
    );
    expect(attentionStore.snapshot().map((item) => item.module)).toEqual(['surveillance']);
    shell.unmount();
    expect(attentionStore.snapshot()).toEqual([]);
  });
});

describe('Tus módulos', () => {
  test('one card per module, the one with alerts first', () => {
    act(() => attentionStore.report('test', 'productivity', [ITEM]));
    render(
      <SurfaceProvider registry={REGISTRY}>
        <ModuleCards />
      </SurfaceProvider>
    );
    expect(screen.getByRole('heading', { name: 'Tus módulos' })).toBeDefined();
    const cards = screen.getAllByText(/^card /).map((node) => node.textContent);
    expect(cards).toEqual(['card productivity', 'card surveillance']);
    expect(screen.queryByRole('link', { name: 'Ver todos los módulos' })).toBeNull();
  });

  test('more than four modules offer «Ver todos los módulos»', () => {
    const many = Array.from({ length: 6 }, (_, index) => moduleOf(`fake-${index}`, 100 + index));
    const view = viewFor('owner');
    mock.module('@/shared/hooks/use-capabilities', () => ({
      useAccessView: () => ({
        ...view,
        activeModules: new Set([...view.activeModules, ...many.map((module) => module.module)]),
      }),
      useCapabilities: () => ({}),
    }));
    render(
      <SurfaceProvider registry={many}>
        <ModuleCards />
      </SurfaceProvider>
    );
    expect(screen.getAllByText(/^card /).length).toBe(4);
    fireEvent.click(screen.getByRole('link', { name: 'Ver todos los módulos' }));
    expect(sheet).toEqual(['full']);
  });

  test('a role with no module gets no empty group', () => {
    const { container } = render(
      <SurfaceProvider registry={[]}>
        <ModuleCards />
      </SurfaceProvider>
    );
    expect(container.textContent).toBe('');
  });

  test('the module cards say their state in one line', () => {
    cache.summary = {
      camerasTotal: 5,
      camerasOnline: 4,
      projectsActive: 1,
      projectsTotal: 1,
      tasksOpen: 3,
    };
    render(
      <>
        <SecurityCard />
        <AgendaCard />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: /^Seguridad, 4 de 5 cámaras en línea/ }));
    fireEvent.click(
      screen.getByRole('button', { name: /^Agenda, 3 tareas abiertas · 1 proyectos activos/ })
    );
    expect(routes).toEqual(['/security', '/agenda']);
  });
});

describe('Personalizar Inicio', () => {
  test('lists the sections, hides one and moves another, and the choice is kept', () => {
    const Section = () => null;
    render(
      <SurfaceProvider
        registry={[
          {
            module: 'core',
            order: 0,
            inicio: [
              {
                id: 'news',
                label: 'screens.home.inicio.sections.news',
                render: Section,
                places: { stack: { order: 50 } },
              },
              {
                id: 'now',
                label: 'screens.home.inicio.sections.now',
                render: Section,
                places: { stack: { order: 20 } },
              },
            ],
          },
        ]}>
        <CustomizeSheet open onClose={() => undefined} />
      </SurfaceProvider>
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar Novedades' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subir Novedades' }));
    expect(saved).toEqual([
      { hidden: ['news'], order: [] },
      { hidden: [], order: ['news', 'now'] },
    ]);
  });
});
