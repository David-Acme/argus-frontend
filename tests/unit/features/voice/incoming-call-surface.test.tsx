import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { RINGING, resetVoiceStub, setSnapshot, voiceStub } from './voice-session-stub';
import '../../shared/ui/translation-stub';

const navigate = mock((_href: string) => undefined);
const route = { pathname: '/' };

mock.module('@/features/voice/services/voice', () => ({ voiceService: voiceStub }));
mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => route.pathname,
  useRouter: () => ({ navigate }),
  useIsFocused: () => true,
}));

const { IncomingCallSurface } = await import('@/features/voice/components/incoming-call-surface');

afterEach(() => {
  route.pathname = '/';
  navigate.mockClear();
  act(() => resetVoiceStub());
});

describe('IncomingCallSurface', () => {
  test('a reminder rings as a dark banner with Argus, the subject and the two round buttons', () => {
    setSnapshot({ waitingCall: RINGING });
    render(<IncomingCallSurface />);
    const banner = screen.getByRole('alertdialog', { name: 'Argus te llama' });
    expect(banner.textContent).toContain('Argus');
    expect(banner.textContent).toContain('Llamada · Pagar la luz');
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Contestar' })).toBeDefined();
    expect(screen.queryByText('En 10 min')).toBeNull();
    expect(screen.queryByText(/Conectando/)).toBeNull();
  });

  test('answering opens the call stage, declining tells the server', () => {
    setSnapshot({ waitingCall: RINGING });
    render(<IncomingCallSurface />);
    fireEvent.click(screen.getByRole('button', { name: 'Contestar' }));
    expect(voiceStub.answerWaiting).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/call');
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(voiceStub.declineCall).toHaveBeenCalledWith('call-41');
  });

  test('an alert takes the full screen with the private line and no snooze', () => {
    setSnapshot({
      waitingCall: {
        ...RINGING,
        urgency: 'critical',
        kind: 'guard_episode',
        subject: 'Alguien en el patio',
        summary: 'Persona desconocida · Patio trasero',
      },
    });
    render(<IncomingCallSurface />);
    const stage = screen.getByRole('alertdialog', { name: 'Alerta en casa' });
    expect(stage.textContent).toContain('Privada · se queda en tu casa');
    expect(stage.textContent).toContain('Alerta en casa · Alguien en el patio');
    expect(stage.textContent).toContain('Persona desconocida · Patio trasero');
    expect(screen.getByText('Rechazar')).toBeDefined();
    expect(screen.getByText('Contestar')).toBeDefined();
    expect(screen.queryByText('En 10 min')).toBeNull();
  });

  test('nothing rings over the call screen or without a held call', () => {
    const { container, rerender } = render(<IncomingCallSurface />);
    expect(container.textContent).toBe('');
    route.pathname = '/call';
    act(() => setSnapshot({ waitingCall: RINGING }));
    rerender(<IncomingCallSurface />);
    expect(container.textContent).toBe('');
  });
});
