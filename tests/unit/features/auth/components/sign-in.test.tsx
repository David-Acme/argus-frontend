import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import * as constants from '@/shared/constants';
import type { FaceCapture } from '@/features/auth/hooks/use-face-capture';
import type { LoginQr } from '@/features/auth/hooks/use-login-qr';
import type { Approve } from '@/features/auth/hooks/use-approve';
import { setWindowSize } from '../../../shared/ui/window-width';
import '../../../shared/ui/translation-stub';

type State = {
  native: boolean;
  pushed: unknown[];
  replaced: unknown[];
  qr: LoginQr;
  approve: Approve;
  opened: number;
};

const marker = (name: string) =>
  function Marker() {
    return <div>{name}</div>;
  };

const qr = (patch: Partial<LoginQr> = {}): LoginQr => ({
  phase: 'qr',
  challengeId: 'a'.repeat(64),
  expiresAt: Math.floor(Date.now() / 1000) + 160,
  refresh: async () => undefined,
  retryOwner: async () => undefined,
  ...patch,
});

const approve = (patch: Partial<Approve> = {}): Approve => ({
  phase: 'idle',
  details: null,
  scanned: async () => undefined,
  approve: async () => undefined,
  deny: async () => undefined,
  ...patch,
});

const state: State = {
  native: false,
  pushed: [],
  replaced: [],
  qr: qr(),
  approve: approve(),
  opened: 0,
};

mock.module('@/shared/constants', () => ({ ...constants, IS_NATIVE: false, IS_WEB: true }));
mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));
mock.module('@/shared/components/ui/lazy-qr-code', () => ({ LazyQrCode: marker('código qr') }));
mock.module('@/shared/components/device-camera/device-camera', () => ({
  DeviceCamera: marker('cámara'),
}));
mock.module('@/features/modules', () => ({ useModuleCatalog: () => null }));
mock.module('@/features/privacy', () => ({ signalsToAsk: () => [] }));
mock.module('@/features/auth/hooks/use-login-qr', () => ({ useLoginQr: () => state.qr }));
mock.module('@/features/auth/hooks/use-approve', () => ({ useApprove: () => state.approve }));
mock.module('@/features/auth/hooks/use-qr-scan', () => ({
  useQrScan: () => () => void (state.opened += 1),
}));
mock.module('@/core/stores', () => ({
  afterSignInHref: () => '/',
  useLocaleStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({ language: 'es', preference: 'es' }),
  useAuthStore: (select: (store: Record<string, unknown>) => unknown) => select({ user: null }),
  useToastStore: { getState: () => ({ show: () => undefined, dismiss: () => undefined }) },
}));
mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () => ({ formatTime: () => '21:54' }),
}));
mock.module('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => <div>{`redirect ${JSON.stringify(href)}`}</div>,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: (href: unknown) => void state.pushed.push(href),
    replace: (href: unknown) => void state.replaced.push(href),
    back: () => undefined,
    canGoBack: () => true,
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/login',
}));

const { default: LoginScreen } = await import('@/features/auth/screens/login-screen');
const { default: ApproveScreen } = await import('@/features/auth/screens/approve-screen');
const { FaceEnrollView } = await import('@/features/auth/components/face-enroll-view');
const { FaceLoginView } = await import('@/features/auth/components/face-login-view');

const capture = (patch: Partial<FaceCapture> = {}): FaceCapture =>
  ({
    enrolling: true,
    granted: true,
    denied: false,
    cameraActive: true,
    phase: 'guide',
    capturing: false,
    error: null,
    notice: null,
    manualAvailable: false,
    done: false,
    guide: { state: null, available: true, onFacesDetected: () => undefined },
    askCamera: async () => undefined,
    captureManually: () => undefined,
    clearError: () => undefined,
    handleCameraReady: () => undefined,
    cameraRef: { current: null },
    ...patch,
  }) as unknown as FaceCapture;

afterEach(() => {
  setSystemTime();
});

beforeEach(() => {
  setWindowSize(1440, 900);
  Object.assign(state, { pushed: [], replaced: [], qr: qr(), approve: approve(), opened: 0 });
});

describe('Entrar en la computadora', () => {
  test('one card with the code, its expiry and three steps, with no phone wording to do here', () => {
    setSystemTime(new Date(2026, 9, 26, 12));
    state.qr = qr();
    render(<LoginScreen />);
    expect(screen.getByRole('heading', { name: 'Entra con tu teléfono' })).toBeDefined();
    expect(screen.getByText('código qr')).toBeDefined();
    expect(screen.getByText(/caduca en 2:40/)).toBeDefined();
    expect(screen.getByText('Toca Tú → Conectar otro dispositivo')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Entrar con la cara' })).toBeNull();
  });

  test('an expired code offers another one', () => {
    let refreshed = 0;
    state.qr = qr({ phase: 'expired', refresh: async () => void (refreshed += 1) });
    render(<LoginScreen />);
    expect(screen.getByText('El código caducó')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar otro código' }));
    expect(refreshed).toBe(1);
  });

  test('a refusal on the phone stops the wait and offers to start again', () => {
    let refreshed = 0;
    state.qr = qr({ phase: 'denied', refresh: async () => void (refreshed += 1) });
    render(<LoginScreen />);
    expect(screen.getByRole('heading', { name: 'No se aprobó la entrada' })).toBeDefined();
    expect(screen.queryByText('código qr')).toBeNull();
    expect(screen.queryByText(/caduca en/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));
    expect(refreshed).toBe(1);
  });

  test('without an owner it says what to do first', () => {
    state.qr = qr({ phase: 'waiting-owner', challengeId: null });
    render(<LoginScreen />);
    expect(screen.getByRole('heading', { name: 'Primero crea tu cuenta' })).toBeDefined();
    expect(screen.queryByText('código qr')).toBeNull();
  });
});

describe('Aprobar en el teléfono', () => {
  test('opens the scanner first', () => {
    setWindowSize(390, 844);
    render(<ApproveScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear el código' }));
    expect(state.opened).toBe(1);
  });

  test('names the device, where and when, and asks yes or no', () => {
    setWindowSize(390, 844);
    let approved = 0;
    state.approve = approve({
      phase: 'confirm',
      approve: async () => void (approved += 1),
      details: {
        challengeId: 'x',
        platform: 'desktop',
        deviceName: 'Portátil · Linux',
        origin: 'lan',
        ipAddress: '192.168.1.4',
        createdAt: 0,
        expiresAt: 0,
      },
    });
    render(<ApproveScreen />);
    expect(screen.getByRole('heading', { name: '¿Entrar en la computadora?' })).toBeDefined();
    expect(screen.getByText('Portátil · Linux')).toBeDefined();
    expect(screen.getByText('Tu red de casa')).toBeDefined();
    expect(screen.getByText('Ahora · 21:54')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, soy yo' }));
    expect(approved).toBe(1);
    expect(screen.getByRole('button', { name: 'No fui yo' })).toBeDefined();
  });
});

describe('Tu cara', () => {
  const place = { flow: 'owner', step: 'face' } as const;

  test('one cue, the finder and the privacy line while it looks for the face', () => {
    setWindowSize(390, 844);
    render(<FaceEnrollView capture={capture()} place={place} onBack={() => undefined} />);
    expect(screen.getByRole('heading', { name: 'Centra tu cara' })).toBeDefined();
    expect(
      screen.getByRole('progressbar', { name: 'Avance de la captura de tu cara' })
    ).toBeDefined();
    expect(screen.getByText('cámara')).toBeDefined();
    expect(screen.getByText(/huella matemática/)).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Tomar la foto yo' }).getAttribute('aria-disabled')
    ).toBe('true');
  });

  test('the ring follows the real capture', () => {
    setWindowSize(360, 640);
    render(
      <FaceEnrollView
        capture={capture({ phase: 'submitting' })}
        place={place}
        onBack={() => undefined}
      />
    );
    expect(screen.getByRole('heading', { name: 'Un poco más' })).toBeDefined();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('90');
  });

  test('without the camera it says so and opens the settings', () => {
    setWindowSize(390, 844);
    render(
      <FaceEnrollView capture={capture({ denied: true })} place={place} onBack={() => undefined} />
    );
    expect(screen.getByRole('heading', { name: 'Necesito la cámara para verte' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Abrir los ajustes' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Volver a preguntar' })).toBeDefined();
  });

  test('signing in greets, and a failure names the light and offers another try', () => {
    setWindowSize(390, 844);
    const view = render(
      <FaceLoginView capture={capture({ enrolling: false })} restoring={false} />
    );
    expect(screen.getByRole('heading', { name: 'Hola de nuevo' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar con otro dispositivo' }));
    expect(state.pushed).toEqual(['/login?method=qr']);
    view.rerender(
      <FaceLoginView
        capture={capture({
          enrolling: false,
          error: { code: 'UNAUTHORIZED', message: 'Face not recognized' },
          guide: { state: 'low-light', available: true, onFacesDetected: () => undefined } as never,
        })}
        restoring={false}
      />
    );
    expect(screen.getByRole('heading', { name: 'No te reconocí' })).toBeDefined();
    expect(screen.getByText('Busca más luz')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Intentar otra vez' })).toBeDefined();
  });
});
