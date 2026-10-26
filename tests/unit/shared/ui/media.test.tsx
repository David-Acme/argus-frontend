import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffectsOverrides } from '@/shared/theme';
import { Media } from '@/shared/ui/media/media';
import { MediaFrame } from '@/shared/ui/media/media-frame';
import { MediaStrip } from '@/shared/ui/media/media-strip';
import { screenFocus } from './screen-focus';
import {
  Controls,
  DormantMark,
  EyeCorner,
  LabelRow,
  LiveChip,
} from '@/shared/ui/media/media-parts';

describe('Media', () => {
  test('a live tile names its camera, its live chip and its time, and opens on press', () => {
    let opened = 0;
    render(
      <Media name="Cocina" detail="14:45" live="En vivo" onPress={() => (opened += 1)}>
        <span data-testid="player" />
      </Media>
    );
    const tile = screen.getByRole('button', { name: 'Cocina, En vivo, 14:45' });
    expect(screen.getByTestId('player')).toBeDefined();
    expect(screen.getByText('En vivo')).toBeDefined();
    fireEvent.click(tile);
    expect(opened).toBe(1);
  });

  test('a filling tile keeps its words and its press while it stretches to its row', () => {
    let opened = 0;
    render(
      <>
        <Media
          fill
          name="Patio trasero"
          detail="ayer"
          live="En vivo"
          onPress={() => (opened += 1)}
        />
        <Media fill name="Garaje" detail="Apagada" dormant="off" />
      </>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Patio trasero, En vivo, ayer' }));
    expect(opened).toBe(1);
    expect(screen.getByText('Apagada')).toBeDefined();
  });

  test('a strip names itself and holds its tiles in order', () => {
    render(
      <MediaStrip label="Cámaras y último clip">
        <Media name="Clip · Puerta principal" detail="14:45" />
        <Media name="Cocina" live="En vivo" />
      </MediaStrip>
    );
    const strip = screen.getByLabelText('Cámaras y último clip');
    expect(strip.textContent).toBe('Clip · Puerta principal14:45En vivoCocina');
  });

  test('the privacy and off states say so in words and hide the player and the live chip', () => {
    render(
      <>
        <Media name="Dormitorio" detail="Privada" dormant="privacy" live="En vivo">
          <span data-testid="player" />
        </Media>
        <Media name="Garaje" detail="Apagada" dormant="off" />
      </>
    );
    expect(screen.getByText('Privada')).toBeDefined();
    expect(screen.getByText('Apagada')).toBeDefined();
    expect(screen.queryByTestId('player')).toBeNull();
    expect(screen.queryByText('En vivo')).toBeNull();
  });

  test('a mouse over a tile reveals its actions and a touch does not', () => {
    const { container } = render(
      <Media
        name="Cocina"
        live="En vivo"
        reveal={<button>Ver</button>}
        center={<span>Play</span>}
      />
    );
    const tile = container.firstElementChild as Element;
    const revealOf = () => screen.getByRole('button', { name: 'Ver' }).parentElement as HTMLElement;
    expect(revealOf().style.opacity).toBe('0');
    fireEvent.pointerEnter(tile, { pointerType: 'touch' });
    expect(revealOf().style.opacity).toBe('0');
    fireEvent.pointerEnter(tile, { pointerType: 'mouse' });
    expect(revealOf().style.opacity).toBe('1');
    fireEvent.pointerLeave(tile, { pointerType: 'mouse' });
    expect(revealOf().style.opacity).toBe('0');
    expect(screen.getByText('Play')).toBeDefined();
  });

  test('a stage carries its controls, the eye corner and a frame', () => {
    let muted = 0;
    render(
      <Media
        variant="stage"
        name="Cocina"
        live="En vivo"
        frame={{ uri: 'https://argus.local/frame.jpg' }}
        eye={{ label: 'Argus mira' }}
        controls={[
          { icon: 'speaker', label: 'Activar sonido', onPress: () => (muted += 1) },
          { icon: 'max', label: 'Pantalla completa', onPress: () => undefined },
        ]}
      />
    );
    expect(screen.getByRole('region', { name: 'Cocina, En vivo' })).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Argus mira')).toBeDefined();
    expect(globalThis.document.querySelector('canvas')?.style.width).toBe('56px');
    fireEvent.click(screen.getByRole('button', { name: 'Activar sonido' }));
    expect(muted).toBe(1);
    expect(screen.getByRole('button', { name: 'Pantalla completa' })).toBeDefined();
  });

  test('a stage in privacy drops its controls', () => {
    render(
      <Media
        variant="stage"
        name="Dormitorio"
        dormant="privacy"
        controls={[{ icon: 'speaker', label: 'Activar sonido', onPress: () => undefined }]}
      />
    );
    expect(screen.queryByRole('button', { name: 'Activar sonido' })).toBeNull();
  });

  test('a stage centres what it says over the picture, and in place of the dormant mark', () => {
    const { rerender } = render(
      <Media variant="stage" name="Cocina" center={<span>La cámara no responde</span>}>
        <span data-testid="player" />
      </Media>
    );
    expect(screen.getByText('La cámara no responde')).toBeDefined();
    expect(screen.getByTestId('player')).toBeDefined();
    rerender(<Media variant="stage" name="Garaje" dormant="off" center={<span>Encender</span>} />);
    expect(screen.getByText('Encender')).toBeDefined();
    expect(globalThis.document.querySelectorAll('svg')).toHaveLength(0);
  });

  test('a new frame keeps the previous one underneath until it has faded in', () => {
    const { container, rerender } = render(
      <MediaFrame source={{ uri: 'https://argus.local/a.jpg' }} />
    );
    const before = container.querySelectorAll('img').length;
    rerender(<MediaFrame source={{ uri: 'https://argus.local/b.jpg' }} />);
    expect(container.querySelectorAll('img').length).toBeGreaterThanOrEqual(before);
  });

  test('the same frame in a new object does not cross-fade, and a faded-in frame drops the last one', async () => {
    const loads: FakeImage[] = [];
    class FakeImage {
      onload: ((event: unknown) => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      constructor() {
        loads.push(this);
      }
      decode() {
        return Promise.resolve();
      }
    }
    const realImage = globalThis.Image;
    Object.assign(globalThis, { Image: FakeImage });
    const { container, rerender } = render(
      <MediaFrame source={{ uri: 'https://argus.local/a.jpg' }} />
    );
    rerender(<MediaFrame source={{ uri: 'https://argus.local/a.jpg' }} />);
    expect(container.querySelectorAll('img').length).toBe(1);
    rerender(<MediaFrame source={{ uri: 'https://argus.local/b.jpg' }} />);
    expect(container.querySelectorAll('img').length).toBe(2);
    await act(async () => {
      loads.find((image) => image.src.endsWith('b.jpg'))?.onload?.({});
      await Promise.resolve();
    });
    expect(container.querySelectorAll('img').length).toBe(1);
    Object.assign(globalThis, { Image: realImage });
  });

  test('the parts render on their own, the live dot still under reduced motion', () => {
    act(() => useEffectsOverrides.setState({ reduceMotion: true, reduceTransparency: true }));
    render(
      <>
        <LiveChip label="En vivo" />
        <LabelRow name="Cocina" detail="14:45" />
        <LabelRow />
        <DormantMark dormant="off" />
        <EyeCorner eye={{ label: 'Argus mira' }} />
        <Controls
          controls={[{ icon: 'max', label: 'Pantalla completa', onPress: () => undefined }]}
        />
      </>
    );
    expect(screen.getByText('En vivo')).toBeDefined();
    expect(screen.getByText('14:45')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pantalla completa' })).toBeDefined();
    act(() => useEffectsOverrides.setState({ reduceMotion: null, reduceTransparency: null }));
  });

  test('the live dot stops breathing while its screen is out of focus', () => {
    const breath = (root: Element) =>
      [...root.querySelectorAll('*')]
        .map((node) => (node as HTMLElement).style?.animationPlayState)
        .filter(Boolean);
    act(() => useEffectsOverrides.setState({ reduceMotion: false }));
    screenFocus.focused = false;
    const { container } = render(<LiveChip label="En vivo" />);
    expect(breath(container)).toEqual(['paused']);
    screenFocus.focused = true;
    act(() => useEffectsOverrides.setState({ reduceMotion: null }));
  });
});
