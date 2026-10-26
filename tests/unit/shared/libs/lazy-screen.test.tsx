import { describe, expect, test } from 'bun:test';
import { act, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { lazyScreen } from '@/shared/libs/lazy-screen';

type AgendaModule = { default: ComponentType };
type FeatureScreens = { CamerasScreen: ComponentType; CameraDetailScreen: ComponentType };

describe('lazyScreen', () => {
  test('paints nothing until its module arrives, then the screen', async () => {
    let arrive: (module: AgendaModule) => void = () => undefined;
    let loads = 0;
    const Agenda = lazyScreen(() => {
      loads += 1;
      return new Promise<AgendaModule>((resolve) => {
        arrive = resolve;
      });
    }, 'default');
    const { container } = render(<Agenda />);
    expect(container.textContent).toBe('');
    await act(async () => arrive({ default: () => <p>Agenda</p> }));
    expect(screen.getByText('Agenda')).toBeDefined();
    expect(loads).toBe(1);
  });

  test('loads its module once for every mount', async () => {
    let loads = 0;
    const Settings = lazyScreen(async () => {
      loads += 1;
      return { default: () => <p>Ajustes</p> };
    }, 'default');
    const first = render(<Settings />);
    expect(await screen.findByText('Ajustes')).toBeDefined();
    first.unmount();
    render(<Settings />);
    expect(await screen.findByText('Ajustes')).toBeDefined();
    expect(loads).toBe(1);
  });

  test('picks the named screen out of a module that holds several', async () => {
    const screens: FeatureScreens = {
      CamerasScreen: () => <p>Cámaras</p>,
      CameraDetailScreen: () => <p>Detalle</p>,
    };
    const Detail = lazyScreen(async () => screens, 'CameraDetailScreen');
    render(<Detail />);
    expect(await screen.findByText('Detalle')).toBeDefined();
    expect(screen.queryByText('Cámaras')).toBeNull();
  });
});
