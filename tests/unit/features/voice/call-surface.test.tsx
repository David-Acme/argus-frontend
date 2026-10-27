import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { CallAudioDevice, VoiceActionRecord } from '@/core/types';
import { callScaleOf } from '@/shared/theme/call-scale';
import { Text } from '@/shared/ui/text';
import '../../shared/ui/translation-stub';

const devices: { list: CallAudioDevice[] } = { list: [] };
const select = mock((_device: CallAudioDevice) => Promise.resolve());

mock.module('@/features/voice/services/call-audio', () => ({
  currentCallAudio: () => ({
    support: { devices: true, routePicker: false },
    devices: () => Promise.resolve(devices.list),
    select,
    showRoutePicker: () => Promise.resolve(),
    subscribe: () => () => undefined,
  }),
}));
mock.module('@/features/voice/hooks/use-call-scale', () => ({
  useCallScale: () => callScaleOf(760),
}));
mock.module('@/features/voice/components/call-settings-dialog', () => ({
  CallSettingsDialog: () => null,
}));

const { CallSurface } = await import('@/features/voice/components/call-surface');
const { CallPanel } = await import('@/features/voice/components/call-panel');

const noop = () => undefined;

async function show(element: ReactElement): Promise<void> {
  await act(async () => {
    render(element);
  });
}

const CAMERA: VoiceActionRecord = {
  id: '1',
  name: 'app.show_camera',
  arguments: { camera: 'Patio trasero' },
  status: 'done',
  detail: null,
};

const NIGHT: VoiceActionRecord = {
  id: '2',
  name: 'app.set_guard_mode',
  arguments: { mode: 'night' },
  status: 'done',
  detail: null,
};

const base = {
  muted: false,
  error: null,
  transcript: [],
  onToggleMute: noop,
  onHangUp: noop,
  onRetry: noop,
};

describe('CallSurface', () => {
  test('while connecting it names the call and never says Conectando', async () => {
    await show(<CallSurface {...base} phase="connecting" reason="Pagar la luz" />);
    expect(screen.getByText('Pagar la luz')).toBeDefined();
    expect(screen.getByText('Privada · se queda en tu casa')).toBeDefined();
    expect(screen.queryByText(/Conectando/)).toBeNull();
  });

  test('a live call shows the clock and the four round controls', async () => {
    await show(<CallSurface {...base} phase="listening" connectedAt={Date.now() - 42_000} />);
    expect(screen.getByText(/^0:4\d$/)).toBeDefined();
    expect(screen.getByRole('switch', { name: 'Altavoz' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ver la cámara' })).toBeDefined();
    expect(screen.getByRole('switch', { name: 'Silenciar micrófono' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Colgar' })).toBeDefined();
  });

  test('mute is a pressed switch with its hint, and hanging up asks once', async () => {
    const toggle = mock(noop);
    const hangUp = mock(noop);
    await show(
      <CallSurface {...base} phase="listening" muted onToggleMute={toggle} onHangUp={hangUp} />
    );
    const mute = screen.getByRole('switch', { name: 'Silenciar micrófono' });
    expect(mute.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Micrófono silenciado')).toBeDefined();
    fireEvent.click(mute);
    fireEvent.click(screen.getByRole('button', { name: 'Colgar' }));
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(hangUp).toHaveBeenCalledTimes(1);
  });

  test('the captions keep the last two lines and the result sits under them', async () => {
    await show(
      <CallSurface
        {...base}
        phase="speaking"
        transcript={[
          { id: 'a', role: 'assistant', text: 'Hola.' },
          { id: 'b', role: 'assistant', text: 'Hay una persona en el patio.' },
          { id: 'c', role: 'user', text: 'Muéstramela.' },
        ]}
        results={<Text>Patio trasero en vivo</Text>}
      />
    );
    expect(screen.queryByText('Hola.')).toBeNull();
    expect(screen.getByText('Hay una persona en el patio.')).toBeDefined();
    expect(screen.getByText('«Muéstramela.»')).toBeDefined();
    const caption = screen.getByText('«Muéstramela.»');
    const card = screen.getByText('Patio trasero en vivo');
    expect(caption.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('the speaker toggles to the speaker route', async () => {
    devices.list = [
      { id: 'e', kind: 'earpiece', direction: 'route', name: 'e', active: true },
      { id: 's', kind: 'speaker', direction: 'route', name: 's', active: false },
    ];
    await show(<CallSurface {...base} phase="listening" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Altavoz' }));
    });
    expect(select).toHaveBeenCalledWith(devices.list[1]);
    devices.list = [];
  });

  test('an ended call sums up what Argus did and offers Volver', async () => {
    const close = mock(noop);
    await show(
      <CallSurface
        {...base}
        phase="done"
        actions={[NIGHT, CAMERA]}
        endedDurationMs={72_000}
        onClose={close}
      />
    );
    expect(screen.getByText('Llamada terminada · 1:12')).toBeDefined();
    expect(screen.getByText('Cámara Patio trasero')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Colgar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('a dropped call offers to close or call again', async () => {
    await show(<CallSurface {...base} phase="error" error="RTC_UNAVAILABLE|down" />);
    expect(screen.getByText('La llamada se cortó')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Volver a llamar' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Colgar' })).toBeNull();
  });

  test('the panel without a camera keeps Cámara visible but disabled', async () => {
    await show(<CallPanel muted={false} onToggleMute={noop} onHangUp={noop} />);
    expect(
      screen.getByRole('button', { name: 'Ver la cámara' }).getAttribute('aria-disabled')
    ).toBe('true');
    expect(screen.getByRole('switch', { name: 'Altavoz' }).getAttribute('aria-disabled')).toBe(
      'true'
    );
  });
});
