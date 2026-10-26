import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { resetVoiceStub, setSnapshot, voiceStub } from './voice-session-stub';
import '../../shared/ui/translation-stub';

const navigate = mock((_href: string) => undefined);
const route = { pathname: '/' };

mock.module('@/features/voice/services/voice', () => ({ voiceService: voiceStub }));
mock.module('@/features/voice/hooks/use-call-bridge', () => ({ useCallBridge: () => undefined }));
mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => route.pathname,
  useRouter: () => ({ navigate }),
  useIsFocused: () => true,
}));

const { CallPill } = await import('@/features/voice/components/call-pill');

afterEach(() => {
  route.pathname = '/';
  navigate.mockClear();
  act(() => resetVoiceStub());
});

describe('CallPill', () => {
  test('a minimised call is a dark bar with Argus, the clock and Colgar', () => {
    setSnapshot({ isActive: true, phase: 'listening', connectedAt: Date.now() - 42_000 });
    render(<CallPill />);
    expect(screen.getByText('Argus')).toBeDefined();
    expect(screen.getByText(/^En llamada · 0:4\d$/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la llamada' }));
    expect(navigate).toHaveBeenCalledWith('/call');
    fireEvent.click(screen.getByRole('button', { name: 'Terminar la llamada' }));
    expect(voiceStub.stop).toHaveBeenCalledTimes(1);
  });

  test('it hides on the call screen and when no call is active', () => {
    const { container, rerender } = render(<CallPill />);
    expect(container.textContent).toBe('');
    route.pathname = '/call';
    act(() => setSnapshot({ isActive: true, phase: 'listening' }));
    rerender(<CallPill />);
    expect(container.textContent).toBe('');
  });
});
