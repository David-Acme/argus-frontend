import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Text } from 'react-native';
import '../translation-stub';

const { PlayerScrubber } = await import('@/shared/ui/media/player/player-scrubber');
const { PlayerSpinner, SeekRipple } = await import('@/shared/ui/media/player/player-parts');
const { PlayerGestures } = await import('@/shared/ui/media/player/player-gestures');
const { PlayerChrome } = await import('@/shared/ui/media/player/player-chrome');

type Chrome = Parameters<typeof PlayerChrome>[0]['player'];

const wait = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

function playerOf(log: string[]): Chrome {
  return {
    status: 'playing',
    painted: true,
    audioLost: false,
    muted: false,
    speed: 1,
    streak: null,
    times: { positionMs: 5000, durationMs: 19_000, bufferedMs: 12_000 },
    controls: {
      shown: true,
      scrubbing: false,
      setScrubbing: () => undefined,
      poke: () => undefined,
      hide: () => undefined,
    },
    seekTo: (ms: number) => void log.push(`seek ${ms}`),
    seekBy: (side: string) => void log.push(`step ${side}`),
    toggle: () => void log.push('toggle'),
    toggleMute: () => void log.push('mute'),
    setSpeed: (speed: number) => void log.push(`speed ${speed}`),
  } as unknown as Chrome;
}

describe('player parts', () => {
  test('the scrubber is a slider that says where the clip is', () => {
    render(
      <PlayerScrubber
        times={{ positionMs: 5000, durationMs: 19_000, bufferedMs: 12_000 }}
        copy={{ label: 'Posición', value: '0:05 de 0:19' }}
        onScrubbing={() => undefined}
        onSeek={() => undefined}
        onStep={() => undefined}
      />
    );
    const slider = screen.getByRole('slider', { name: 'Posición' });
    expect(slider.getAttribute('aria-valuetext')).toBe('0:05 de 0:19');
  });

  test('the seek ripple shows how far the taps went', () => {
    render(<SeekRipple streak={{ side: 'forward', count: 2, at: 0 }} label="20 s" />);
    expect(screen.getByText('20 s')).toBeDefined();
  });

  test('the spinner waits 300 ms before it shows', async () => {
    render(<PlayerSpinner shown label="Cargando" />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    await wait(350);
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeDefined();
  });

  test('the gesture layer keeps what it covers', () => {
    render(
      <PlayerGestures player={playerOf([])}>
        <Text>debajo</Text>
      </PlayerGestures>
    );
    expect(screen.getByText('debajo')).toBeDefined();
  });

  test('the chrome pauses, mutes, goes fullscreen and sets the speed from its «⋯»', async () => {
    const log: string[] = [];
    render(
      <PlayerChrome
        player={playerOf(log)}
        fullscreen={false}
        onFullscreen={() => void log.push('fullscreen')}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opciones del video' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Velocidad 1.5×' }));
    await wait(10);
    expect(log).toEqual(['toggle', 'mute', 'fullscreen', 'speed 1.5']);
  });
});
