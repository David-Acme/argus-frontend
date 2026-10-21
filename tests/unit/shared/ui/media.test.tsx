import { describe, expect, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffectsOverrides } from '@/shared/theme';
import { Media } from '@/shared/ui/media/media';
import { MediaFrame } from '@/shared/ui/media/media-frame';
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
        eye={{ label: 'Argus mira', presence: <span data-testid="presence" /> }}
        controls={[
          { icon: 'speaker', label: 'Activar sonido', onPress: () => (muted += 1) },
          { icon: 'max', label: 'Pantalla completa', onPress: () => undefined },
        ]}
      />
    );
    expect(screen.getByRole('region', { name: 'Cocina, En vivo' })).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Argus mira')).toBeDefined();
    expect(screen.getByTestId('presence')).toBeDefined();
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
});
