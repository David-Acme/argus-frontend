import { afterEach, describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GuardEpisode } from '@/core/types';
import type { CameraTiles } from '@/features/security/hooks/use-security-cameras';
import type { SecurityTile } from '@/features/security/model/camera-tiles';
import { setWindowWidth } from '../../../shared/ui/window-width';
import { NOW, environment, episode, format, guest, maintenanceWindow } from '../security-fixtures';
import { access, calls, data, resetStubs, routes } from './security-stubs';

const { CameraGrid } = await import('@/features/security/components/page/camera-grid');
const { CamerasSection } = await import('@/features/security/components/page/cameras-section');
const { HappenedSection } = await import('@/features/security/components/page/happened-section');
const { ModeControl } = await import('@/features/security/components/page/mode-control');
const { MoreSection } = await import('@/features/security/components/page/more-section');
const { PlacePicker } = await import('@/features/security/components/page/place-picker');
const { EpisodeSheet } = await import('@/features/security/components/page/episode-sheet');
const { PromiseSection, TrySection } =
  await import('@/features/security/components/page/starter-sections');
const { ActivitySection, MaintenanceSection, PlacesSection, VisitsSection } =
  await import('@/features/security/components/page/aside-sections');
const { ScreenColumn, ScreenColumns } = await import('@/shared/ui/screen/screen-columns');

type ColumnProps = { children: ReactNode };

const TILES: SecurityTile[] = [
  { id: '3', name: 'Patio trasero', state: 'live', at: NOW - 15 * 60_000 },
  { id: '7', name: 'Dormitorio', state: 'private', at: null },
  { id: '5', name: 'Garaje', state: 'off', at: null },
  { id: '6', name: 'Jardín', state: 'offline', at: null },
  { id: '8', name: 'Sala', state: 'live', at: null },
];

function cameras(overrides: Partial<CameraTiles> = {}): CameraTiles {
  return {
    visible: true,
    cameras: [],
    tiles: TILES,
    events: [
      {
        id: 'a',
        cameraId: 3,
        at: NOW - 60_000,
        rule: '',
        severity: '',
        label: 'person',
        zoneName: '',
      },
    ],
    now: NOW,
    format,
    canCreate: true,
    canTalk: true,
    ...overrides,
  };
}

function feed(rows: GuardEpisode[], status: 'loading' | 'ready' | 'failed' = 'ready') {
  return { rows, status, reload: async () => void calls.push('reload') };
}

function InColumn({ children }: ColumnProps) {
  return (
    <ScreenColumns>
      <ScreenColumn label="Columna">{children}</ScreenColumn>
    </ScreenColumns>
  );
}

afterEach(() => {
  setWindowWidth(360);
  resetStubs();
});

describe('Cámaras', () => {
  test('on a phone four tiles say their state in words and «Todas (5)» opens the list', () => {
    render(<CamerasSection cameras={cameras()} desktop={false} onConnect={() => undefined} />);
    const tiles = screen
      .getAllByRole('button')
      .map((node) => node.getAttribute('aria-label'))
      .filter((label) => label?.includes(','));
    expect(tiles).toEqual([
      'Patio trasero, En vivo, 14:45',
      'Dormitorio, Privada',
      'Garaje, Apagada',
      'Jardín, Sin conexión',
    ]);
    fireEvent.click(screen.getByRole('link', { name: 'Todas (5)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Patio trasero, En vivo, 14:45' }));
    expect(routes).toEqual(['/cameras', '/cameras/3']);
  });

  test('on desktop every tile shows and live ones reveal Ver and Hablar by name', () => {
    setWindowWidth(1280);
    render(
      <InColumn>
        <CamerasSection cameras={cameras()} desktop onConnect={() => undefined} />
      </InColumn>
    );
    expect(screen.getByRole('button', { name: 'Sala, En vivo, sin novedad' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Hablar por Patio trasero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver Sala' }));
    expect(screen.queryByRole('button', { name: 'Hablar por Dormitorio' })).toBeNull();
    expect(routes).toEqual(['/cameras/3?talk=1', '/cameras/8']);
  });

  test('with no camera the empty state offers the wizard, and a guard only reads why', () => {
    let connected = 0;
    const { unmount } = render(
      <CamerasSection
        cameras={cameras({ tiles: [] })}
        desktop={false}
        onConnect={() => (connected += 1)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Conectar cámara' }));
    expect(connected).toBe(1);
    unmount();
    render(
      <CamerasSection
        cameras={cameras({ tiles: [], canCreate: false })}
        desktop={false}
        onConnect={() => undefined}
      />
    );
    expect(screen.getByText('Conecta tu primera cámara')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Conectar cámara' })).toBeNull();
  });

  test('a desktop with one camera says how many are online and offers another', () => {
    setWindowWidth(1280);
    render(
      <InColumn>
        <CamerasSection
          cameras={cameras({ tiles: TILES.slice(0, 1) })}
          desktop
          onConnect={() => undefined}
        />
        <PromiseSection />
      </InColumn>
    );
    expect(screen.getByText('1 de 1 en línea')).toBeDefined();
    expect(screen.getByText('Conecta otra cámara')).toBeDefined();
    expect(screen.getByText('Reconoce a tu familia')).toBeDefined();
  });

  test('without the camera capability the section is gone', () => {
    const { container } = render(
      <CamerasSection
        cameras={cameras({ visible: false })}
        desktop={false}
        onConnect={() => undefined}
      />
    );
    expect(container.textContent).toBe('');
  });

  test('the grid alone can open without talk', () => {
    render(
      <CameraGrid
        tiles={TILES.slice(0, 2)}
        frames={new Map()}
        now={NOW}
        format={format}
        fill={false}
        onOpen={(id) => void routes.push(id)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dormitorio, Privada' }));
    expect(routes).toEqual(['7']);
  });
});

describe('Lo que pasó', () => {
  const rows = [
    episode({ id: 1, lastSeen: Math.floor(NOW / 1000) - 120 }),
    episode({ id: 2, notified: true }),
  ];

  test('on a phone the pending review comes first with its chip, and «Ver todo» opens the list', () => {
    const opened: number[] = [];
    render(
      <HappenedSection
        feed={feed(rows)}
        limit={3}
        feedForm={false}
        onOpen={(row) => opened.push(row.id)}
      />
    );
    expect(screen.getByText('Revisar')).toBeDefined();
    const [first] = screen.getAllByRole('button', { name: /^Persona desconocida, Patio trasero/ });
    first?.click();
    fireEvent.click(screen.getByRole('link', { name: 'Ver todo' }));
    expect(opened).toEqual([2]);
    expect(routes).toEqual(['/security/episodes']);
  });

  test('in a column it is a feed whose Revisar names its episode', () => {
    const opened: number[] = [];
    render(
      <HappenedSection feed={feed(rows)} limit={8} feedForm onOpen={(row) => opened.push(row.id)} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Revisar: Persona desconocida, Patio trasero' })
    );
    expect(opened).toEqual([2]);
    expect(screen.getByRole('img', { name: 'Por revisar' })).toBeDefined();
  });

  test('loading shows its rows, failure offers Reintentar, and nothing yet is calm', () => {
    const { container, rerender } = render(
      <HappenedSection
        feed={feed([], 'loading')}
        limit={3}
        feedForm={false}
        onOpen={() => undefined}
      />
    );
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    rerender(
      <HappenedSection
        feed={feed([], 'failed')}
        limit={3}
        feedForm={false}
        onOpen={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(calls).toEqual(['reload']);
    rerender(
      <HappenedSection feed={feed([])} limit={3} feedForm={false} onOpen={() => undefined} />
    );
    expect(screen.getByText('Todo tranquilo')).toBeDefined();
    expect(screen.getByText('Aún no ha pasado nada que contar.')).toBeDefined();
  });

  test('the full list has no heading of its own', () => {
    render(<HappenedSection feed={feed(rows)} feedForm bare onOpen={() => undefined} />);
    expect(screen.queryByRole('heading', { name: 'Lo que pasó' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ver todo' })).toBeNull();
  });
});

describe('the mode control', () => {
  test('four modes as a radio group, applied on a tap', () => {
    const picked: string[] = [];
    render(<ModeControl value="home" onChange={(mode) => picked.push(mode)} />);
    expect(screen.getByRole('radiogroup', { name: 'Modo' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Casa' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Noche' }));
    expect(picked).toEqual(['night']);
  });

  test('mixed modes check nothing, and a role that may not change it sees no control', () => {
    const { rerender } = render(<ModeControl value={null} onChange={() => undefined} />);
    expect(
      screen.getAllByRole('radio').filter((radio) => radio.getAttribute('aria-checked') === 'true')
    ).toEqual([]);
    rerender(<ModeControl value="home" />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});

describe('the place picker', () => {
  test('the title opens the places with «Todos los lugares», and a pick closes it', () => {
    const picks: (number | string)[] = [];
    const home = environment();
    const shop = environment({ id: 2, name: 'Restaurante Centro', kind: 'restaurant' });
    render(
      <PlacePicker
        title="Casa"
        environments={[home, shop]}
        current={home}
        onPick={(pick) => picks.push(pick)}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Casa' }));
    expect(screen.getByRole('dialog', { name: 'Lugares' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Todos los lugares' }));
    expect(picks).toEqual(['all']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Más and the desktop asides', () => {
  test('the rows open their short screens, people seen only for the owner', () => {
    data.windows = [maintenanceWindow()];
    const { unmount } = render(<MoreSection guests={[guest()]} environments={[environment()]} />);
    for (const name of [
      /^Visitas esperadas/,
      /^Lugares y modos/,
      /^Mantenimiento/,
      /^Personas vistas/,
    ])
      fireEvent.click(screen.getByRole('button', { name }));
    expect(routes).toEqual([
      '/security/visits',
      '/security/places',
      '/security/maintenance',
      '/users/visitors',
    ]);
    unmount();
    access.owner = false;
    render(<MoreSection guests={[]} environments={[environment()]} without="visits" />);
    expect(screen.queryByRole('button', { name: /^Personas vistas/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Visitas esperadas/ })).toBeNull();
  });

  test('visits, places, maintenance and activity fill the third column', () => {
    data.windows = [maintenanceWindow()];
    render(
      <>
        <VisitsSection guests={[guest()]} now={NOW} />
        <PlacesSection environments={[environment({ cameraIds: [3] })]} />
        <MaintenanceSection now={NOW} />
        <ActivitySection cameras={cameras()} />
      </>
    );
    expect(screen.getByText('Hoy hasta 18:00')).toBeDefined();
    expect(screen.getByText('En casa · 2 cámaras')).toBeDefined();
    expect(screen.getAllByText('Patio trasero')).toHaveLength(2);
    expect(screen.getByText('Persona · 14:59')).toBeDefined();
    expect(screen.getByText('Apagada')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Casa/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Técnico de internet/ }));
    expect(routes).toEqual(['/security/1', '/security/visits']);
  });

  test('no visit is still a row that opens visits, and no maintenance hides its section', () => {
    render(
      <>
        <VisitsSection guests={[]} now={NOW} />
        <MaintenanceSection now={NOW} />
      </>
    );
    expect(screen.getByText('Nadie por ahora')).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Mantenimiento' })).toBeNull();
  });

  test('«Prueba esto» sets Noche, plans a visit and teaches the family', () => {
    let night = 0;
    render(<TrySection onNight={() => (night += 1)} />);
    fireEvent.click(screen.getByRole('button', { name: /^Pon el modo Noche/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Agenda una visita/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Enséñale tu familia/ }));
    expect(night).toBe(1);
    expect(routes).toEqual(['/security/visits', '/users']);
  });

  test('«Prueba esto» is gone when there is nothing this role can try', () => {
    Object.assign(access, { owner: false, manageGuests: false });
    const { container } = render(<TrySection />);
    expect(container.textContent).toBe('');
  });
});

describe('the episode sheet', () => {
  const actions = {
    review: async (row: GuardEpisode, label: string) => calls.push(`review:${row.id}:${label}`) > 0,
    retain: async (row: GuardEpisode, keep: boolean) => calls.push(`retain:${row.id}:${keep}`) > 0,
  };

  test('a person Argus told you about asks ¿Acertó? and keeps the incident', () => {
    const told = episode({ id: 9, notified: true, notifyCount: 2, reasons: ['night'] });
    render(
      <EpisodeSheet
        episode={told}
        where="Patio trasero"
        actions={actions}
        onClose={() => undefined}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Persona desconocida' })).toBeDefined();
    expect(screen.getByText('Te avisó · 2 avisos')).toBeDefined();
    expect(screen.getByText('timeline 9')).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: 'Falsa alarma' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Guardar como incidente' }));
    expect(calls).toEqual(['review:9:false_alarm', 'retain:9:true']);
  });

  test('the footer opens the camera, and an active tamper offers «Fui yo» instead', async () => {
    let closed = 0;
    const { rerender } = render(
      <EpisodeSheet
        episode={episode({ id: 4 })}
        where="Patio"
        actions={actions}
        onClose={() => (closed += 1)}
      />
    );
    expect(screen.queryByRole('radiogroup', { name: '¿Acertó?' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver cámara' }));
    expect(routes).toEqual(['/cameras/3']);
    rerender(
      <EpisodeSheet
        episode={episode({ id: 5, kind: 'camera', state: 'active', status: 'covered' })}
        where="Patio"
        actions={actions}
        onClose={() => (closed += 1)}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Imagen tapada' })).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Fui yo' }));
    });
    expect(calls).toEqual(['claim:5']);
    expect(closed).toBe(2);
  });

  test('no episode, no sheet', () => {
    const { container } = render(
      <EpisodeSheet episode={null} where="" actions={actions} onClose={() => undefined} />
    );
    expect(container.textContent).toBe('');
  });
});
