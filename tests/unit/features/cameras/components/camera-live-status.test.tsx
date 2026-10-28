import { describe, expect, test } from 'bun:test';
import { render, screen, within } from '@testing-library/react';
import '../../../shared/ui/translation-stub';

const { Media } = await import('@/shared/ui/media');
const { CameraLiveStatus } = await import('@/features/cameras/components/camera-live-status');

describe('CameraLiveStatus', () => {
  test('on a named tile the connecting pill sits in the middle, apart from the camera name', () => {
    render(
      <Media name="Patio trasero" live="En vivo" fill>
        <CameraLiveStatus state="connecting" painted={false} compact />
      </Media>
    );
    const center = screen.getByTestId('camera-live-center');
    expect(within(center).getByText('Conectando con la cámara')).toBeDefined();
    expect(within(center).queryByText('Patio trasero')).toBeNull();
  });

  test('a reconnecting tile keeps its picture and centres the pill', () => {
    render(<CameraLiveStatus state="reconnecting" painted compact />);
    expect(
      within(screen.getByTestId('camera-live-center')).getByText('Reconectando…')
    ).toBeDefined();
  });

  test('a live tile draws no pill of its own, and the full view keeps the live pill in its corner', () => {
    const tile = render(<CameraLiveStatus state="live" painted compact />);
    expect(screen.queryByTestId('camera-live-center')).toBeNull();
    expect(screen.queryByTestId('camera-live-corner')).toBeNull();
    tile.unmount();
    render(<CameraLiveStatus state="live" painted />);
    expect(screen.getByTestId('camera-live-corner')).toBeDefined();
  });
});
