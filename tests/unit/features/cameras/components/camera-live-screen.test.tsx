import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CameraClipsState } from '@/features/cameras/hooks/use-camera-clips';
import type { CameraLive } from '@/features/cameras/hooks/use-camera-live';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import {
  ALL_CONTROLS,
  aimControls,
  calls,
  cameraRow,
  dockOf,
  liveOf,
  liveView,
  ptzControls,
  sirenControls,
} from './camera-fixtures';

const pushed: string[] = [];

let view: CameraLive | null = liveView();

let clips: CameraClipsState;

mock.module('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => <span data-testid="redirect">{href}</span>,
  useLocalSearchParams: () => ({ id: '3' }),
  useRouter: () => ({
    push: (href: string) => pushed.push(href),
    back: () => pushed.push('back'),
    canGoBack: () => true,
    replace: (href: string) => pushed.push(href),
  }),
  useIsFocused: () => screenFocus.focused,
}));

mock.module('@/features/cameras/hooks/use-camera-live', () => ({
  useCameraLive: () => view,
  useCameraRow: () => view?.camera ?? null,
}));

mock.module('@/features/cameras/hooks/use-camera-meta', () => ({ useCameraMeta: () => 'Casa' }));

mock.module('@/features/cameras/hooks/use-camera-clips', () => ({ useCameraClips: () => clips }));

mock.module('@/features/cameras/components/players', () => ({
  CameraLiveView: () => <span data-testid="player" />,
  ClipPlayer: () => null,
}));

mock.module('@/features/cameras/components/camera-form', () => ({ CameraForm: () => null }));

mock.module('@/features/cameras/components/camera-fullscreen', () => ({
  CameraFullscreen: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <View testID="fullscreen">{children}</View> : null,
}));

mock.module('react-native-safe-area-context', () => ({
  SafeAreaView: View,
  SafeAreaInsetsContext: { Provider: View, Consumer: View },
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

mock.module('@/features/voice', () => ({ isVoiceCallActive: () => false }));

mock.module('@/core/services/camera.service', () => ({ cameraService: {} }));

mock.module('@/shared/libs/optimistic-action', () => ({
  runOptimistic: async () => {
    calls.push('optimistic');
    return null;
  },
}));

mock.module('@/shared/libs/service-action', () => ({ runServiceAction: async () => null }));

mock.module('@/features/cameras/services/camera-control.service', () => ({
  cameraControlService: {},
}));

const { default: CameraLiveScreen } = await import('@/features/cameras/screens/camera-live-screen');
const { LiveStageView } = await import('@/features/cameras/components/live/live-stage');
const { LiveFullscreen } = await import('@/features/cameras/components/live/live-fullscreen');
const { LiveRows } = await import('@/features/cameras/components/live/live-rows');
const { LiveNotices } = await import('@/features/cameras/components/live/live-notices');
const { LiveMenu } = await import('@/features/cameras/components/live/live-menu');
const { TalkDock } = await import('@/features/cameras/components/live/talk-dock');
const { DockActions } = await import('@/features/cameras/components/live/dock-actions');
const { LevelMeter } = await import('@/features/cameras/components/live/level-meter');
const { PtzPad } = await import('@/features/cameras/components/live/ptz-pad');

const NOW = Date.now();

function clipsState(count: number): CameraClipsState {
  return {
    clips: Array.from({ length: count }, (_, index) => ({
      id: String(index),
      cameraId: '3',
      trigger: 'event',
      contentType: 'video/mp4',
      codec: 'h264',
      startedAt: Math.floor(NOW / 1000) - index,
      durationMs: 1000,
      byteSize: 100,
      createdAt: 0,
      expiresAt: 0,
    })),
    status: 'ready',
    hasMore: false,
    loadingMore: false,
    loadMore: () => undefined,
    forget: () => undefined,
    reload: async () => undefined,
  };
}

afterEach(() => {
  calls.length = 0;
  pushed.length = 0;
  view = liveView();
});

describe('the live camera screen', () => {
  test('draws the prototype: title, place, the live stage, the three rows and hold to talk', () => {
    clips = clipsState(3);
    render(<CameraLiveScreen />);
    expect(screen.getByRole('heading', { name: 'Cocina' })).toBeDefined();
    expect(screen.getByText('Casa')).toBeDefined();
    expect(screen.getByText('En vivo')).toBeDefined();
    expect(screen.getByText('Argus mira')).toBeDefined();
    expect(screen.getByTestId('player')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Grabaciones, 3 hoy' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Zonas, Jardín, Ventana del vecino' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Ajustes de la cámara, Privacidad, ronda, sensibilidad' })
    ).toBeDefined();
    expect(screen.getAllByText('Mantén para hablar por la cámara').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Llamar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sirena' })).toBeDefined();
  });

  test('the rows open their screens', () => {
    clips = clipsState(0);
    render(<CameraLiveScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Grabaciones, Ninguna hoy' }));
    fireEvent.click(screen.getByRole('button', { name: /^Zonas/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Ajustes de la cámara/ }));
    expect(pushed).toEqual(['/cameras/3/recordings', '/cameras/3/zones', '/cameras/3/settings']);
  });

  test('a camera with no zones and no recordings says so and still leads somewhere', () => {
    clips = clipsState(0);
    view = liveView({ camera: cameraRow({ zones: [], recordMode: 'off' }) });
    render(<CameraLiveScreen />);
    expect(screen.getByRole('button', { name: 'Grabaciones, No graba' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Zonas, Sin zonas' })).toBeDefined();
  });

  test('a camera that is gone redirects to the list', () => {
    view = null;
    render(<CameraLiveScreen />);
    expect(screen.getByTestId('redirect').textContent).toBe('/cameras');
  });

  test('the stage controls toggle movement, sound and fullscreen', () => {
    clips = clipsState(0);
    render(<CameraLiveScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Mover la cámara' }));
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar la cámara' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    expect(calls).toEqual(['ptz:true', 'sound', 'fullscreen:true']);
  });

  test('the hold button reports its press and release, Llamar opens a call', () => {
    clips = clipsState(0);
    render(<CameraLiveScreen />);
    const hold = screen.getByRole('button', { name: 'Mantén para hablar por la cámara' });
    fireEvent.keyDown(hold, { key: 'Enter' });
    fireEvent.keyUp(hold, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Llamar' }));
    expect(calls).toEqual(['hold-start', 'hold-stop', 'start:call']);
  });
});

describe('the stage states', () => {
  const stageOnly = (stage: CameraLive['live']['stage'], onTurnOn: (() => void) | null = null) =>
    render(
      <LiveStageView
        cameraId="3"
        live={liveOf(stage)}
        controls={{ ...liveView().controls, eye: false }}
        ptz={null}
        onTurnOn={onTurnOn}
      />
    );

  test('privacy shows a lock and says Argus neither looks nor listens, with no player or controls', () => {
    stageOnly({ kind: 'privacy' });
    expect(screen.getByText('Privada: Argus no mira ni escucha')).toBeDefined();
    expect(screen.queryByTestId('player')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Pantalla completa' })).toBeNull();
  });

  test('an unreachable camera says so, what to check, and offers Reintentar', () => {
    stageOnly({ kind: 'blocked', message: 'screens.cameras.stage.unreachable', retry: true });
    expect(screen.getByText('La cámara no responde')).toBeDefined();
    expect(screen.getByText('Revisa que esté encendida y en tu Wi-Fi.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(calls).toEqual(['retry']);
  });

  test('a camera that is off can be turned on by who may', () => {
    let turned = 0;
    stageOnly({ kind: 'off' }, () => (turned += 1));
    fireEvent.click(screen.getByRole('button', { name: 'Encender cámara' }));
    expect(turned).toBe(1);
  });

  test('connecting is a calm stage with no words', () => {
    const { container } = stageOnly({ kind: 'connecting' });
    expect(container.textContent).toBe('');
  });
});

describe('the dock', () => {
  test('talking fills the button and shows the level instead of the caption', () => {
    render(
      <TalkDock
        dock={dockOf({ phase: 'talking', level: 0.5 })}
        controls={liveView().controls}
        note={null}
        cameraName="Cocina"
      />
    );
    expect(
      screen.getByRole('meter', { name: 'Nivel de tu micrófono' }).getAttribute('aria-valuenow')
    ).toBe('6');
  });

  test('in a call the big button hangs up and the microphone can be silenced', () => {
    render(
      <TalkDock
        dock={dockOf({ phase: 'call' })}
        controls={liveView().controls}
        note={null}
        cameraName="Cocina"
      />
    );
    expect(screen.getByText('En llamada con Cocina')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Colgar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar micrófono' }));
    expect(calls).toEqual(['end', 'muted:true']);
  });

  test('a denied microphone asks again, and a missing talk says why', () => {
    render(
      <TalkDock
        dock={dockOf({
          trouble: { message: 'screens.cameras.call.error-mic-denied', askMic: true },
        })}
        controls={{ ...liveView().controls, talk: false }}
        note="argus-busy"
        cameraName="Cocina"
      />
    );
    expect(screen.queryByRole('button', { name: 'Mantén para hablar por la cámara' })).toBeNull();
    expect(
      screen.getByText('Termina la llamada con Argus para hablar por la cámara.')
    ).toBeDefined();
    fireEvent.click(screen.getByText('Permitir el micrófono'));
    expect(calls).toEqual(['allow-mic']);
  });

  test('the siren asks first, counts down with Cancelar and stops in one tap', async () => {
    const { rerender } = render(
      <DockActions
        dock={dockOf({ siren: sirenControls({ phase: 'confirm' }) })}
        controls={liveView().controls}
        cameraName="Cocina"
      />
    );
    expect(screen.getByText('¿Hacer sonar la sirena?')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hacer sonar' }));
    });
    rerender(
      <DockActions
        dock={dockOf({ siren: sirenControls({ phase: 'countdown', remaining: 4 }) })}
        controls={liveView().controls}
        cameraName="Cocina"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar · 4' }));
    rerender(
      <DockActions
        dock={dockOf({
          siren: sirenControls({ phase: 'sounding', sounding: true, remaining: 12 }),
        })}
        controls={liveView().controls}
        cameraName="Cocina"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Detener · 12 s' }));
    expect(calls).toEqual(['siren-confirm', 'siren-cancel', 'siren-stop']);
  });

  test('the meter is bounded', () => {
    render(<LevelMeter level={3} label="Nivel" />);
    expect(screen.getByRole('meter', { name: 'Nivel' }).getAttribute('aria-valuenow')).toBe('12');
  });
});

describe('moving the camera', () => {
  test('the pad steps on a tap, in four directions', () => {
    render(<PtzPad ptz={ptzControls} />);
    for (const name of ['Arriba', 'Izquierda', 'Derecha', 'Abajo']) {
      const button = screen.getByRole('button', { name });
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter' });
    }
    expect(calls).toEqual(['step:up', 'step:left', 'step:right', 'step:down']);
  });

  test('while steering, the notices name who holds the camera and the saved positions', () => {
    render(
      <LiveNotices
        view={liveView({
          live: liveOf({ kind: 'live' }, { ptzShown: true }),
          aim: aimControls({ lease: 'mine' }),
        })}
      />
    );
    expect(screen.getByText('Tú controlas la cámara')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Entrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Posición de vigilancia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar posición' }));
    expect(calls).toEqual(['goto:1', 'go-home', 'save-preset']);
  });

  test('a fallback to the lighter stream offers to go back', () => {
    const view = liveView();
    render(
      <LiveNotices
        view={{
          ...view,
          live: { ...view.live, quality: { ...view.live.quality, fellBack: true } },
        }}
      />
    );
    fireEvent.click(screen.getByText('Volver a Alta'));
    expect(calls).toEqual(['restore']);
  });

  test('nothing to say renders nothing', () => {
    const { container } = render(<LiveNotices view={liveView()} />);
    expect(container.textContent).toBe('');
  });
});

describe('the menu, the rows and fullscreen', () => {
  test('the menu holds the announcement, the quality and the owner actions', async () => {
    render(
      <LiveMenu
        camera={cameraRow()}
        access={{ update: true, remove: true }}
        quality={liveView().live.quality}
        onEdit={() => calls.push('edit')}
        onAnnounce={() => calls.push('announce')}
      />
    );
    fireEvent.keyDown(screen.getByLabelText('Más opciones'), { key: 'Enter' });
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual([
      'Escribir un aviso',
      'Ver en alta calidad',
      'Editar cámara',
      'Desactivar cámara',
      'Eliminar cámara',
    ]);
    fireEvent.click(screen.getByText('Escribir un aviso'));
    expect(calls).toEqual(['announce']);
  });

  test('a single item is no menu at all', () => {
    const { container } = render(
      <LiveMenu
        camera={cameraRow()}
        access={{ update: false, remove: false }}
        quality={liveView().live.quality}
        onEdit={() => undefined}
        onAnnounce={null}
      />
    );
    expect(container.textContent).toBe('');
  });

  test('the rows hide recordings from a role without clips', () => {
    clips = clipsState(0);
    render(<LiveRows camera={cameraRow()} clips={false} sections={['listen', 'device']} />);
    expect(screen.queryByText('Grabaciones')).toBeNull();
    expect(
      screen.getByRole('button', {
        name: 'Ajustes de la cámara, Escucha, mantenimiento, dispositivo',
      })
    ).toBeDefined();
  });

  test('fullscreen plays one picture with a way out and the sound', () => {
    const live = liveOf({ kind: 'live' }, { fullscreen: true });
    render(<LiveFullscreen cameraId="3" live={live} controls={ALL_CONTROLS} ptz={null} />);
    expect(screen.getByTestId('player')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Salir de pantalla completa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar la cámara' }));
    expect(calls).toEqual(['fullscreen:false', 'sound']);
  });
});
