import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RINGING, resetVoiceStub, setSnapshot, voiceStub } from './voice-session-stub';
import '../../shared/ui/translation-stub';

const navigate = mock((_href: string) => undefined);
const route = { pathname: '/' };
const snoozeAnswer: { ok: boolean } = { ok: true };
const snooze = mock(async (_reminderId: number) =>
  snoozeAnswer.ok
    ? { ok: true, status: 200, info: null, errors: null }
    : { ok: false, status: 404, info: null, errors: { code: 'NOT_FOUND', message: 'gone' } }
);

const toasts: string[] = [];

mock.module('@/features/voice/services/voice', () => ({ voiceService: voiceStub }));
mock.module('@/shared/libs/toast', () => ({
  toast: { success: (title: string) => void toasts.push(title) },
}));
mock.module('@/shared/libs/service-error', () => ({
  toastServiceError: (_error: unknown, title: string) => void toasts.push(title),
}));
mock.module('@/features/voice/services/call-action/call-action.service', () => ({
  reminderCallService: { snooze, markDone: mock(async () => ({ ok: true })), act: mock() },
}));
mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => route.pathname,
  useRouter: () => ({ navigate }),
  useIsFocused: () => true,
}));

const { IncomingCallSurface } = await import('@/features/voice/components/incoming-call-surface');

const REMINDER_RING = { ...RINGING, category: 'reminder' as const, reminderId: 77 };

afterEach(() => {
  route.pathname = '/';
  snoozeAnswer.ok = true;
  snooze.mockClear();
  toasts.length = 0;
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

  test('a ring that names its reminder offers En 10 min, which snoozes the reminder and ends the ring', async () => {
    setSnapshot({ waitingCall: REMINDER_RING });
    render(<IncomingCallSurface />);
    const buttons = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(buttons).toEqual(['Rechazar', 'En 10 min', 'Contestar']);
    fireEvent.click(screen.getByRole('button', { name: 'En 10 min' }));
    fireEvent.click(screen.getByRole('button', { name: 'En 10 min' }));
    await waitFor(() => expect(voiceStub.declineCall).toHaveBeenCalledWith('call-41'));
    expect(snooze).toHaveBeenCalledTimes(1);
    expect(snooze).toHaveBeenCalledWith(77);
    expect(toasts).toEqual(['Te llamo de nuevo en 10 min']);
  });

  test('a refused snooze keeps the ring and says why', async () => {
    snoozeAnswer.ok = false;
    setSnapshot({ waitingCall: REMINDER_RING });
    render(<IncomingCallSurface />);
    fireEvent.click(screen.getByRole('button', { name: 'En 10 min' }));
    await waitFor(() => expect(toasts.length).toBe(1));
    expect(toasts[0]).toBe('No se pudo posponer');
    expect(voiceStub.declineCall).not.toHaveBeenCalled();
  });

  test('a calendar or arrival call that names no reminder never offers En 10 min', () => {
    setSnapshot({ waitingCall: { ...RINGING, category: 'reminder', reminderId: null } });
    render(<IncomingCallSurface />);
    expect(screen.queryByRole('button', { name: 'En 10 min' })).toBeNull();
  });

  test('an alert takes the full screen with the private line and no snooze', () => {
    setSnapshot({
      waitingCall: {
        ...RINGING,
        urgency: 'critical',
        kind: 'guard_episode',
        subject: 'Alguien en el patio',
        summary: 'Persona desconocida · Patio trasero',
        category: 'alert',
        reminderId: 77,
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
