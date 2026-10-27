import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as constants from '@/shared/constants';
import type { PrivacyChoices } from '@/core/types';
import type { FaceCapture } from '@/features/auth/hooks/use-face-capture';
import type { PairingFlow } from '@/features/auth/hooks/use-pairing-flow';
import { setWindowSize } from '../../../shared/ui/window-width';
import '../../../shared/ui/translation-stub';

type State = {
  replaced: unknown[];
  params: Record<string, string>;
  draft: PrivacyChoices | null;
  pairing: PairingFlow;
  scans: string[];
  accept: {
    ok: boolean;
    status: number;
    info: { role: string; inviterName?: string | null } | null;
    errors: unknown;
  };
  decided: number;
  decideOk: boolean;
  callStarted: unknown[];
  microphone: boolean;
  capture: Partial<FaceCapture>;
  language: string;
};

const OFF: PrivacyChoices = {
  presence: false,
  faceCameras: false,
  voiceLearning: false,
  cameraAudio: false,
};

const marker = (name: string) =>
  function Marker() {
    return <div>{name}</div>;
  };

const pairing = (patch: Partial<PairingFlow> = {}): PairingFlow => ({
  search: 'found',
  error: null,
  paired: false,
  busy: false,
  connect: async () => undefined,
  scanned: async () => undefined,
  searchAgain: () => undefined,
  ...patch,
});

const state: State = {
  replaced: [],
  params: {},
  draft: null,
  pairing: pairing(),
  scans: [],
  accept: { ok: true, status: 200, info: { role: 'resident' }, errors: null },
  decided: 0,
  decideOk: true,
  callStarted: [],
  microphone: true,
  capture: {},
  language: 'es',
};

mock.module('@/shared/constants', () => ({ ...constants, IS_NATIVE: true, IS_WEB: false }));
mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));
mock.module('@/shared/components/device-camera/device-camera', () => ({
  DeviceCamera: marker('cámara'),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: () => true }),
}));
mock.module('@/shared/hooks/use-device-permissions', () => ({
  useDevicePermissions: () => ({
    permissions: state.microphone ? [] : [{ id: 'microphone', granted: false }],
    loaded: true,
    allGranted: state.microphone,
    request: () => undefined,
    requestRuntime: async () => undefined,
  }),
}));
mock.module('@/features/modules', () => ({
  useModuleCatalog: () => ({ modules: [], fetchedAt: 0 }),
}));
mock.module('@/features/privacy', () => ({
  signalsToAsk: () => ['cameraAudio'],
  coreSignals: () => ['voiceLearning'],
  onlyCoreChoices: (choices: PrivacyChoices) => choices,
  NO_CHOICES: OFF,
  PRIVACY_NOTICE_VERSION: 2,
  PrivacyNoticeDialog: () => null,
  consentDraft: {
    peek: () => state.draft,
    set: (choices: PrivacyChoices) => void (state.draft = choices),
    take: () => void (state.draft = null),
  },
  answeredChoices: (_stored: PrivacyChoices, _asked: unknown, choices: PrivacyChoices) => choices,
  decisionOf: (choices: PrivacyChoices) => choices,
  usePrivacy: () => ({ me: { choices: OFF } }),
  privacyService: {
    decide: async () => {
      state.decided += 1;
      return { ok: state.decideOk };
    },
  },
}));
mock.module('@/features/voice', () => ({
  argusCallSupported: () => true,
  useCall: (options: unknown) => {
    state.callStarted.push(options);
    return {
      phase: 'listening',
      muted: false,
      error: null,
      transcript: [],
      actions: [],
      connectedAt: 1,
    };
  },
  CallSurface: ({ footnote }: { footnote: unknown }) => <div>{footnote as never}</div>,
}));
mock.module('@/features/auth/hooks/use-pairing-flow', () => ({
  usePairingFlow: () => state.pairing,
}));
mock.module('@/features/auth/hooks/use-face-capture', () => ({
  useFaceCapture: () => ({
    enrolling: true,
    granted: false,
    denied: false,
    cameraActive: false,
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
    ...state.capture,
  }),
}));
mock.module('@/features/auth/hooks/use-qr-scan', () => ({
  useQrScan: (purpose: string, onValue: (value: string) => void) => () => {
    state.scans.push(purpose);
    onValue('{"v":1}');
  },
}));
mock.module('@/shared/libs/invitation-qr', () => ({ parseInvitationQr: () => ({ token: 't' }) }));
mock.module('@/core/services/invite', () => ({
  inviteService: { accept: async () => state.accept },
}));
mock.module('@/core/stores', () => ({
  useQrScanStore: { getState: () => ({ clear: () => undefined }) },
  useToastStore: { getState: () => ({ show: () => undefined, dismiss: () => undefined }) },
  useAuthStore: (select: (store: Record<string, unknown>) => unknown) => select({ user: null }),
  useLocaleStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({ setLanguage: (next: string) => void (state.language = next) }),
}));
mock.module('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => <div>{`redirect ${JSON.stringify(href)}`}</div>,
  useLocalSearchParams: () => state.params,
  useRouter: () => ({
    push: () => undefined,
    replace: (href: unknown) => void state.replaced.push(href),
    back: () => undefined,
    canGoBack: () => false,
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/welcome',
}));

const { default: PairingScreen } = await import('@/features/auth/screens/pairing-screen');
const { default: PrivacyScreen } = await import('@/features/auth/screens/privacy-screen');
const { default: ModulePrivacyScreen } =
  await import('@/features/auth/screens/onboarding-module-privacy-screen');
const { default: InvitationRoute } = await import('@/features/auth/screens/invitation-screen');
const { default: CallScreen } = await import('@/features/auth/screens/onboarding-call-screen');
const { default: FaceScreen } = await import('@/features/auth/screens/face-screen');
const { LanguageSwitch } = await import('@/features/auth/components/language-switch');

beforeEach(() => {
  setWindowSize(390, 844);
  Object.assign(state, {
    replaced: [],
    params: {},
    draft: null,
    pairing: pairing(),
    scans: [],
    accept: { ok: true, status: 200, info: { role: 'resident' }, errors: null },
    decided: 0,
    decideOk: true,
    callStarted: [],
    microphone: true,
    capture: {},
  });
});

describe('the onboarding routes', () => {
  test('pairing picks its view from the flow and scans a QR on the phone', () => {
    const view = render(<PairingScreen />);
    expect(screen.getByRole('heading', { name: 'Conecta con tu Argus' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear el código QR' }));
    expect(state.scans).toEqual(['server']);
    state.pairing = pairing({ error: 'FINGERPRINT_MISMATCH' });
    view.rerender(<PairingScreen />);
    expect(screen.getByRole('heading', { name: 'Este no parece tu Argus' })).toBeDefined();
  });

  test('consent is kept as a draft and leads to the face', () => {
    state.params = { mode: 'owner-enroll' };
    render(<PrivacyScreen />);
    fireEvent.click(screen.getByRole('switch', { name: 'Aprender tu voz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y seguir' }));
    expect(state.draft).toEqual({ ...OFF, voiceLearning: true });
    expect(state.replaced).toEqual([
      { pathname: '/welcome/face', params: { mode: 'owner-enroll' } },
    ]);
  });

  test('the module answers stay on screen when the save fails', async () => {
    state.decideOk = false;
    render(<ModulePrivacyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y seguir' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined());
    expect(state.replaced).toEqual([]);
    state.decideOk = true;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(state.replaced).toHaveLength(1));
  });

  test('a valid invitation shows its role before it starts', async () => {
    render(<InvitationRoute />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear la invitación' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Te invitaron a una casa' })).toBeDefined()
    );
    expect(screen.getByText(/Entrarás como residente/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar y empezar' }));
    expect(state.replaced).toEqual([
      { pathname: '/welcome/privacy', params: { mode: 'invite-enroll' } },
    ]);
  });

  test('a valid invitation names who invited when the server knows', async () => {
    state.accept = {
      ok: true,
      status: 200,
      info: { role: 'guest', inviterName: 'Ana' },
      errors: null,
    };
    render(<InvitationRoute />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear la invitación' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Ana te invitó a una casa' })).toBeDefined()
    );
    expect(screen.getByText(/Entrarás como invitado/)).toBeDefined();
  });

  test('an expired invitation says so', async () => {
    state.accept = {
      ok: false,
      status: 410,
      info: null,
      errors: { code: 'INVITATION_EXPIRED', message: 'x' },
    };
    render(<InvitationRoute />);
    fireEvent.click(screen.getByRole('button', { name: 'Escanear la invitación' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Esta invitación ya no vale' })).toBeDefined()
    );
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeDefined();
  });

  test('the first call is an onboarding call, skipped without a microphone', () => {
    const view = render(<CallScreen />);
    expect(state.callStarted).toEqual([{ purpose: 'onboarding' }]);
    expect(screen.getByText('Puedes colgar cuando quieras. Seguimos en Inicio.')).toBeDefined();
    state.microphone = false;
    view.rerender(<CallScreen />);
    expect(screen.getByText(/redirect/).textContent).toContain('/welcome/ready');
  });

  test('the face step needs the consent first, then shows the dark finder', () => {
    state.params = { mode: 'owner-enroll' };
    const view = render(<FaceScreen />);
    expect(screen.getByText(/redirect/).textContent).toContain('/welcome/privacy');
    state.draft = OFF;
    view.rerender(<FaceScreen />);
    expect(screen.getByRole('heading', { name: 'Centra tu cara' })).toBeDefined();
  });

  test('the language switch changes the app language', () => {
    render(<LanguageSwitch />);
    fireEvent.click(screen.getByRole('radio', { name: 'EN' }));
    expect(state.language).toBe('en');
  });
});
