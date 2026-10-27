import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { VoiceActionRecord } from '@/core/types';
import '../../shared/ui/translation-stub';

const voice = { sttText: '', listeners: new Set<() => void>(), path: '/' };

const navigate = mock((_href: string) => undefined);

mock.module('@/features/voice/services/voice', () => ({
  voiceService: {
    get sttTextValue() {
      return voice.sttText;
    },
    subscribe: (listener: () => void) => {
      voice.listeners.add(listener);
      return () => voice.listeners.delete(listener);
    },
  },
}));

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
  useRouter: () => ({ navigate }),
  usePathname: () => voice.path,
}));

const { ArgusListening } = await import('@/features/voice/components/argus-listening');
const { useHoldTalkStore } = await import('@/features/voice/stores/hold-talk.store');
const { HOLD_IDLE, HOLD_NOT_HEARD } = await import('@/features/voice/model/hold-talk');

const NIGHT: VoiceActionRecord = {
  id: '3',
  name: 'app.set_guard_mode',
  arguments: { mode: 'night' },
  status: 'done',
  detail: null,
};

function hear(text: string) {
  act(() => {
    voice.sttText = text;
    for (const listener of voice.listeners) listener();
  });
}

function setStage(patch: Partial<typeof HOLD_IDLE>) {
  act(() => useHoldTalkStore.setState({ hold: { ...HOLD_IDLE, ...patch } }));
}

afterEach(() => {
  voice.sttText = '';
  navigate.mockClear();
  act(() => useHoldTalkStore.setState({ hold: HOLD_IDLE }));
});

describe('ArgusListening', () => {
  test('idle and cancelled draw nothing', () => {
    const { container } = render(<ArgusListening />);
    expect(container.textContent).toBe('');
    setStage({ stage: 'cancelled' });
    expect(container.textContent).toBe('');
  });

  test('listening shows the live transcript once words arrive', () => {
    setStage({ stage: 'listening' });
    const { container } = render(<ArgusListening />);
    expect(container.textContent).toBe('');
    hear('pon la casa en modo noche');
    expect(screen.getByText('«pon la casa en modo noche»')).toBeDefined();
  });

  test('sending keeps the words in a polite status while Argus thinks', () => {
    voice.sttText = 'qué tengo hoy';
    setStage({ stage: 'sending', releasedAt: 1 });
    render(<ArgusListening />);
    const status = screen.getByRole('status', { name: 'Pensando…' });
    expect(status.textContent).toContain('«qué tengo hoy»');
  });

  test('the answer card carries the reply and the result chip and opens the thread', () => {
    setStage({
      stage: 'answered',
      answer: { said: 'modo noche', reply: 'Listo, la casa está en modo noche.', action: NIGHT },
    });
    render(<ArgusListening />);
    expect(screen.getByText('Modo night')).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', { name: 'Listo, la casa está en modo noche. Ver la conversación' })
    );
    expect(navigate).toHaveBeenCalledWith('/conversations/0');
    expect(useHoldTalkStore.getState().hold).toEqual(HOLD_IDLE);
  });

  test('an outside tap closes the card', () => {
    setStage({ stage: 'answered', answer: { said: 'hola', reply: 'Hola, Ana.', action: null } });
    render(<ArgusListening />);
    const outside = screen.getByTestId('argus-listening-outside');
    fireEvent.mouseDown(outside);
    fireEvent.mouseUp(outside);
    expect(useHoldTalkStore.getState().hold).toEqual(HOLD_IDLE);
    expect(navigate).not.toHaveBeenCalled();
  });

  test('an answer without an action has no chip', () => {
    setStage({ stage: 'answered', answer: { said: 'hola', reply: 'Hola, Ana.', action: null } });
    const { container } = render(<ArgusListening />);
    expect(container.textContent).toBe('Hola, Ana.');
  });

  test('a failure is worded from the code, never the raw text, and polite', () => {
    setStage({ stage: 'failed', error: HOLD_NOT_HEARD });
    render(<ArgusListening />);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('No te escuché.');
    expect(status.textContent).toContain('Mantén pulsado Argus mientras hablas.');
    expect(status.textContent).not.toContain('HOLD_NOT_HEARD');
  });

  test('a server error shows the generic words', () => {
    setStage({ stage: 'failed', error: 'RTC_UNAVAILABLE|livekit is down' });
    render(<ArgusListening />);
    expect(screen.getByRole('status').textContent).toBe(
      'Argus no pudo escucharte.Inténtalo de nuevo en un momento.'
    );
  });

  test('on the Argus thread the hold draws inline, so no floating card shows', () => {
    voice.path = '/conversations/0';
    voice.sttText = 'pon el modo noche';
    act(() => useHoldTalkStore.setState({ hold: { ...HOLD_IDLE, stage: 'listening' } }));
    render(<ArgusListening />);
    expect(screen.queryByText('«pon el modo noche»')).toBeNull();
    voice.path = '/';
  });
});
