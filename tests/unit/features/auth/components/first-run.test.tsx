import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { IServiceResponse } from '@/core/interfaces';
import type { DevicePermission, PrivacyChoices } from '@/core/types';
import * as constants from '@/shared/constants';
import type { ModuleStep } from '@/features/modules';
import { setWindowSize } from '../../../shared/ui/window-width';
import '../../../shared/ui/translation-stub';

type State = {
  replaced: unknown[];
  pushed: unknown[];
  params: Record<string, string>;
  userName: string;
  saved: unknown[];
  answer: IServiceResponse<unknown>;
  permissions: DevicePermission[];
  requested: string[];
  modules: string[];
  step: ModuleStep;
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

const state: State = {
  replaced: [],
  pushed: [],
  params: {},
  userName: 'Usuario',
  saved: [],
  answer: { ok: true, status: 200, info: null, errors: null },
  permissions: [],
  requested: [],
  modules: [],
  step: {
    status: 'ready',
    cards: [],
    fits: true,
    toggle: () => undefined,
    start: async () => undefined,
  },
};

mock.module('@/shared/constants', () => ({ ...constants, IS_NATIVE: true, IS_WEB: false }));
mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));
mock.module('@/features/modules', () => ({
  useModuleCatalog: () => null,
  useModuleStep: () => state.step,
}));
mock.module('@/features/privacy', () => ({
  signalsToAsk: () => [],
  chosenModuleIds: () => state.modules,
  PRIVACY_NOTICE_VERSION: 2,
  PrivacyNoticeDialog: ({ open }: { open: boolean }) => (open ? <div>aviso completo</div> : null),
}));
mock.module('@/core/services/modules', () => ({ moduleEngine: { current: () => null } }));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: () => true }),
}));
mock.module('@/shared/hooks/use-device-permissions', () => ({
  useDevicePermissions: () => ({
    permissions: state.permissions,
    loaded: true,
    allGranted: false,
    request: (id: string) => void state.requested.push(id),
    requestRuntime: async () => undefined,
  }),
}));
mock.module('@/features/auth/services/self-name.service', () => ({
  saveSelfName: async (value: unknown) => {
    state.saved.push(value);
    return state.answer;
  },
}));
mock.module('@/core/stores', () => ({
  useAuthStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({ user: { id: 1, name: state.userName } }),
  useLocaleStore: (select: (store: Record<string, unknown>) => unknown) =>
    select({ setLanguage: () => undefined }),
}));
mock.module('expo-router', () => ({
  Redirect: ({ href }: { href: unknown }) => <div>{`redirect ${JSON.stringify(href)}`}</div>,
  useLocalSearchParams: () => state.params,
  useRouter: () => ({
    push: (href: unknown) => void state.pushed.push(href),
    replace: (href: unknown) => void state.replaced.push(href),
    back: () => undefined,
    canGoBack: () => false,
  }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/welcome',
}));

const { default: WelcomeScreen } = await import('@/features/auth/screens/welcome-screen');
const { default: NameScreen } = await import('@/features/auth/screens/name-screen');
const { default: OnboardingPermissionsScreen } =
  await import('@/features/auth/screens/onboarding-permissions-screen');
const { default: OnboardingReadyScreen } =
  await import('@/features/auth/screens/onboarding-ready-screen');
const { default: OnboardingModulesScreen } =
  await import('@/features/auth/screens/onboarding-modules-screen');
const { PrivacyStep } = await import('@/features/auth/components/privacy-step');
const { PairingAddressView, PairingCodeView } =
  await import('@/features/auth/components/pairing-views');
const { MismatchView } = await import('@/features/auth/components/mismatch-view');
const { pairingStateOf } = await import('@/features/auth/model/pairing-state');

type Form = Parameters<typeof PairingCodeView>[0]['form'];

const form = (patch: Partial<Form> = {}): Form => ({
  state: pairingStateOf({ search: 'found', error: null, manual: false, paired: false }),
  code: '',
  address: '',
  busy: false,
  ready: false,
  setCode: () => undefined,
  setAddress: () => undefined,
  connect: async () => undefined,
  back: () => undefined,
  searchAgain: () => undefined,
  scan: () => undefined,
  openAddress: () => undefined,
  ...patch,
});

const within = (node: ReactNode) => render(<>{node}</>);

beforeEach(() => {
  setWindowSize(360, 760);
  Object.assign(state, {
    replaced: [],
    pushed: [],
    params: {},
    userName: 'Usuario',
    saved: [],
    answer: { ok: true, status: 200, info: null, errors: null },
    permissions: [],
    requested: [],
    modules: [],
  });
});

describe('Bienvenida', () => {
  test('greets, promises privacy and starts the owner flow', () => {
    render(<WelcomeScreen />);
    expect(screen.getByRole('heading', { name: 'Hola, soy Argus' })).toBeDefined();
    expect(screen.getByText('Todo se queda en tu casa')).toBeDefined();
    expect(screen.getByText('Vigilo tu casa')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Comenzar' }));
    expect(state.pushed).toEqual([{ pathname: '/welcome/pairing', params: { flow: 'owner' } }]);
  });

  test('a tablet shows the same steps in one card', () => {
    setWindowSize(820, 1180);
    render(<WelcomeScreen />);
    expect(screen.getByRole('heading', { name: 'Hola, soy Argus' })).toBeDefined();
  });
});

describe('Vincular', () => {
  test('says where Argus was found and asks for the code', () => {
    within(<PairingCodeView form={form()} />);
    expect(screen.getByRole('heading', { name: 'Conecta con tu Argus' })).toBeDefined();
    expect(screen.getByText('Encontré a tu Argus en tu red.')).toBeDefined();
    expect(screen.getByLabelText('Código de vínculo')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Conectar' }).getAttribute('aria-disabled')).toBe(
      'true'
    );
  });

  test('a wrong code is said under the code', () => {
    const wrong = pairingStateOf({
      search: 'found',
      error: 'INVALID_PAIRING_CODE',
      manual: false,
      paired: false,
    });
    within(<PairingCodeView form={form({ state: wrong })} />);
    expect(screen.getByRole('alert').textContent).toContain('Ese código no es de este Argus');
  });

  test('not found opens the address with its help', () => {
    const missing = pairingStateOf({
      search: 'missing',
      error: null,
      manual: false,
      paired: false,
    });
    within(<PairingAddressView form={form({ state: missing })} />);
    expect(screen.getByRole('heading', { name: 'No encuentro a Argus en tu red' })).toBeDefined();
    expect(screen.getByLabelText('Dirección de Argus')).toBeDefined();
    expect(screen.getByText('Misma red Wi-Fi')).toBeDefined();
  });

  test('a different identity stops with a plain explanation', () => {
    let restarted = 0;
    within(<MismatchView onRestart={() => void (restarted += 1)} />);
    expect(screen.getByRole('heading', { name: 'Este no parece tu Argus' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a empezar' }));
    expect(restarted).toBe(1);
  });
});

describe('¿Cómo te llamo?', () => {
  test('a server placeholder is not offered as the name, and the name is required', async () => {
    render(<NameScreen />);
    const name = screen.getByLabelText('Nombre') as HTMLInputElement;
    expect(name.value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => expect(screen.getByText('Escribe tu nombre.')).toBeDefined());
    expect(state.saved).toEqual([]);
  });

  test('saves the name once and moves on', async () => {
    state.userName = 'David';
    state.params = { flow: 'owner' };
    render(<NameScreen />);
    fireEvent.change(screen.getByLabelText('Apellido · opcional'), {
      target: { value: '  Acme ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() => expect(state.replaced).toHaveLength(1));
    expect(state.saved).toEqual([{ name: 'David', lastName: 'Acme' }]);
    expect(state.replaced[0]).toEqual({ pathname: '/welcome/modules', params: { flow: 'owner' } });
  });

  test('a field refusal shows under its field, a network failure stays on screen', async () => {
    state.userName = 'David';
    state.answer = {
      ok: false,
      status: 422,
      info: null,
      errors: { code: 'VALIDATION_ERROR', message: 'x', fields: { lastName: ['bad'] } },
    };
    render(<NameScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() =>
      expect(
        screen.getByText('Usa solo letras, espacios, apóstrofos, guiones y puntos.')
      ).toBeDefined()
    );
    state.answer = {
      ok: false,
      status: 0,
      info: null,
      errors: { code: 'NETWORK_ERROR', message: 'x' },
    };
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }));
    await waitFor(() =>
      expect(
        screen.getByText('No pude guardar tu nombre. Revisa la conexión y vuelve a intentarlo.')
      ).toBeDefined()
    );
    expect(state.replaced).toEqual([]);
  });
});

describe('Privacidad', () => {
  test('one switch per signal, the full notice on request, Reintentar after a failed save', () => {
    const changes: string[] = [];
    const view = within(
      <PrivacyStep
        place={{ flow: 'owner', step: 'privacy' }}
        signals={['voiceLearning', 'cameraAudio']}
        choices={OFF}
        failed={false}
        onChange={(signal) => void changes.push(signal)}
        onAccept={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Aprender tu voz' }));
    expect(changes).toEqual(['voiceLearning']);
    fireEvent.click(screen.getByRole('button', { name: 'Leer el aviso completo' }));
    expect(screen.getByText('aviso completo')).toBeDefined();
    view.rerender(
      <PrivacyStep
        place={{ flow: 'owner', step: 'module-privacy' }}
        signals={['cameraAudio']}
        choices={OFF}
        failed
        onChange={() => undefined}
        onAccept={() => undefined}
      />
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined();
    expect(screen.getByText(/No pude guardar tus preferencias/)).toBeDefined();
  });
});

describe('Módulos, Permisos y Listo', () => {
  test('module cards are checkboxes', () => {
    const toggled: string[] = [];
    state.step = {
      status: 'ready',
      fits: true,
      start: async () => undefined,
      toggle: (id) => void toggled.push(id),
      cards: [
        {
          id: 'surveillance',
          name: 'Seguridad',
          summary: 'Cámaras',
          note: 'Funciona desde ya',
          selected: true,
          selectable: true,
        },
        {
          id: 'productivity',
          name: 'Productividad',
          summary: 'Agenda',
          note: 'Funciona desde ya',
          selected: false,
          selectable: true,
        },
      ],
    };
    render(<OnboardingModulesScreen />);
    expect(screen.getByRole('checkbox', { name: 'Seguridad' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Productividad' }));
    expect(toggled).toEqual(['productivity']);
  });

  test('permissions are asked once, per row', () => {
    state.permissions = [
      { id: 'notifications', granted: true },
      { id: 'microphone', granted: false },
    ];
    render(<OnboardingPermissionsScreen />);
    expect(screen.getByText('Listo')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Permitir' }));
    expect(state.requested).toEqual(['microphone']);
  });

  test('Listo greets by name and lists only what was set up', () => {
    state.userName = 'David';
    state.modules = ['surveillance'];
    render(<OnboardingReadyScreen />);
    expect(screen.getByRole('heading', { name: 'Todo listo, David' })).toBeDefined();
    expect(screen.getByText('Seguridad activa')).toBeDefined();
    expect(screen.queryByText('Avisos activados')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ir a Inicio' }));
    expect(state.replaced).toEqual(['/']);
  });
});
