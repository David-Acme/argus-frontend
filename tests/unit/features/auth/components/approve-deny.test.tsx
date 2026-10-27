import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DeviceLoginDetails } from '@/core/types';
import { setWindowSize } from '../../../shared/ui/window-width';
import '../../../shared/ui/translation-stub';

type Answer = { status: number; ok: boolean; info: unknown; errors: null };

type Pending = { resolve: (answer: Answer) => void };

const CHALLENGE = 'b'.repeat(64);

const DETAILS: DeviceLoginDetails = {
  challengeId: CHALLENGE,
  platform: 'desktop',
  deviceName: 'Portátil · Linux',
  origin: 'lan',
  ipAddress: '192.168.1.4',
  createdAt: 0,
  expiresAt: 0,
};

const state: { denied: string[]; pending: Pending[] } = { denied: [], pending: [] };

const marker = (name: string) =>
  function Marker() {
    return <div>{name}</div>;
  };

mock.module('@/core/services/auth.service', () => ({
  authService: {
    deviceLoginDetails: async () => ({ status: 200, ok: true, info: DETAILS, errors: null }),
    approveDeviceLogin: async () => ({
      status: 200,
      ok: true,
      info: { approved: true },
      errors: null,
    }),
    denyDeviceLogin: (id: string) => {
      state.denied.push(id);
      return new Promise<Answer>((resolve) => void state.pending.push({ resolve }));
    },
  },
}));
mock.module('@/features/auth/hooks/use-qr-scan', () => ({
  useQrScan: (_purpose: string, onValue: (value: string) => void) => () =>
    onValue(JSON.stringify({ v: 1, t: 'login', id: CHALLENGE })),
}));
mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));
mock.module('@/features/modules', () => ({ useModuleCatalog: () => null }));
mock.module('@/features/privacy', () => ({ signalsToAsk: () => [] }));
mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () => ({ formatTime: () => '21:54' }),
}));
mock.module('expo-router', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
    canGoBack: () => true,
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/approve',
}));

const { default: ApproveScreen } = await import('@/features/auth/screens/approve-screen');

const settle = (answer: Answer) => {
  for (const pending of state.pending.splice(0)) pending.resolve(answer);
};

async function openConfirm() {
  render(<ApproveScreen />);
  fireEvent.click(screen.getByRole('button', { name: 'Escanear el código' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: '¿Entrar en la computadora?' })).toBeDefined()
  );
}

beforeEach(() => {
  setWindowSize(390, 844);
  Object.assign(state, { denied: [], pending: [] });
});

describe('«No fui yo» on the phone', () => {
  test('refuses on the server once, however many times it is pressed, and says so', async () => {
    await openConfirm();
    const deny = screen.getByRole('button', { name: 'No fui yo' });
    fireEvent.click(deny);
    fireEvent.click(deny);
    await waitFor(() => expect(state.denied).toEqual([CHALLENGE]));
    settle({ status: 200, ok: true, info: { denied: true }, errors: null });
    await waitFor(() => expect(screen.getByText(/Rechacé la entrada/)).toBeDefined());
    expect(state.denied).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'No fui yo' })).toBeNull();
  });

  test('a code that is gone reads as expired', async () => {
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'No fui yo' }));
    await waitFor(() => expect(state.pending).toHaveLength(1));
    settle({ status: 404, ok: false, info: null, errors: null });
    await waitFor(() => expect(screen.getByText(/Ese código ya no vale/)).toBeDefined());
  });

  test('a failed refusal keeps the question so it can be pressed again', async () => {
    await openConfirm();
    fireEvent.click(screen.getByRole('button', { name: 'No fui yo' }));
    await waitFor(() => expect(state.pending).toHaveLength(1));
    settle({ status: 0, ok: false, info: null, errors: null });
    await waitFor(() => expect(screen.getByText(/No pude rechazar la entrada/)).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'No fui yo' }));
    await waitFor(() => expect(state.denied).toHaveLength(2));
  });
});
