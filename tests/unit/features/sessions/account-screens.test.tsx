import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AuthSession, CallPreferences, ModuleRecord, PrivacyMe } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { overviewOf } from '@/features/sessions/model/sessions';
import { moduleRecord } from '@tests/support/access-fixtures';
import '../../shared/ui/translation-stub';

const NOW = 1_791_835_200;

const session = (id: string, platform: AuthSession['platform'], current: boolean): AuthSession => ({
  id,
  platform,
  deviceName: current ? 'Escritorio de Ana' : null,
  createdAt: NOW - 86_400,
  lastSeenAt: NOW - 300,
  expiresAt: NOW + 86_400,
  current,
});

const CHOICES = { presence: true, faceCameras: false, voiceLearning: true, cameraAudio: false };

const PRIVACY: PrivacyMe = {
  decided: true,
  noticeVersion: 2,
  current: true,
  decidedAt: NOW - 86_400,
  updatedAt: NOW - 86_400,
  choices: CHOICES,
  effective: CHOICES,
  currentNoticeVersion: 2,
  household: { ...CHOICES, faceCameras: true, cameraAudio: false },
};

const CALLS: CallPreferences = {
  userId: 1,
  enabled: true,
  guardCritical: 'call',
  guardIntruder: 'call',
  guardEscalation: 'notify',
  guardArrival: 'notify',
  agenda: 'notify',
  assistant: 'call',
  quietStartHour: 22,
  quietEndHour: 7,
  dndUntil: 0,
  criticalBypass: true,
  mutedEnvironmentIds: [],
  updatedAt: NOW,
  agendaLeadMinutes: 10,
  quietDays: 0,
  ringSeconds: 30,
  pushDelaySeconds: 4,
  liveAnnounce: true,
  lang: '',
};

const state = {
  sessions: [session('a', 'desktop', true), session('b', 'android', false)],
  answered: true,
  failed: false,
  closed: [] as string[],
  privacy: PRIVACY as PrivacyMe | null,
  privacyStatus: 'ready',
  choices: [] as string[],
  calls: CALLS as CallPreferences | null,
  patches: [] as unknown[],
  modules: [] as ModuleRecord[],
  toggled: [] as string[],
  requested: [] as string[],
  pushed: [] as unknown[],
};

mock.module('@/features/sessions/hooks/use-sessions', () => ({
  useSessions: () => ({
    overview: overviewOf(state.sessions),
    now: NOW,
    loading: false,
    failed: state.failed,
    answered: state.answered,
    busy: null,
    reload: async () => undefined,
    closeOne: async (target: AuthSession) => void state.closed.push(target.id),
    closeOthers: async () => void state.closed.push('others'),
    closeAll: async () => void state.closed.push('all'),
    closeHere: async () => void state.closed.push('here'),
  }),
}));
mock.module('@/features/sessions/hooks/use-this-device', () => ({
  useThisDevice: () => ({
    instance: { ip: '192.168.1.40', host: 'argus.local', pairedAt: Date.UTC(2026, 9, 1) },
    unpair: async () => undefined,
  }),
}));
mock.module('@/features/privacy/hooks/use-privacy', () => ({
  usePrivacy: () => ({
    me: state.privacy,
    status: state.privacyStatus,
    reload: async () => undefined,
    setChoice: async (signal: string, value: boolean) =>
      void state.choices.push(`${signal}:${value}`),
    setLocation: async () => undefined,
  }),
}));
mock.module('@/features/privacy/components/privacy-notice-dialog', () => ({
  PrivacyNoticeDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="aviso" /> : null,
}));
mock.module('@/features/voice/hooks/use-call-preferences', () => ({
  useCallPreferences: () => ({
    preferences: state.calls,
    status: state.calls ? 'ready' : 'failed',
    update: async (patch: unknown) => void state.patches.push(patch),
    reload: async () => undefined,
  }),
}));
mock.module('@/features/modules/hooks/use-module-switches', () => ({
  useModuleSwitches: () => ({
    catalog: { fetchedAt: 0, modules: state.modules },
    modules: state.modules,
    status: 'ready',
    pending: null,
    run: async () => true,
    toggle: (module: ModuleRecord) => void state.toggled.push(module.id),
    removeData: (module: ModuleRecord) => void state.toggled.push(`remove:${module.id}`),
    runJob: () => undefined,
    busy: () => false,
    uninstall: {
      target: null,
      close: () => undefined,
      submit: async () => undefined,
      start: async () => undefined,
    },
    disable: { target: null, busy: false, close: () => undefined, confirm: async () => undefined },
  }),
}));
mock.module('@/features/modules/hooks/use-module-catalog', () => ({
  useModuleCatalog: () => ({ fetchedAt: 0, modules: state.modules }),
}));
mock.module('@/features/modules/hooks/use-module-request', () => ({
  useModuleRequest: () => ({
    request: async (id: string) => void state.requested.push(id),
    pending: null,
    alreadyAsked: () => false,
    hidden: new Set<string>(),
  }),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ moduleActive: () => true, has: () => true, roleActive: true }),
}));
mock.module('@/features/modules/components/disable-dialog', () => ({ DisableDialog: () => null }));
mock.module('@/features/modules/components/uninstall-dialog', () => ({
  UninstallDialog: () => null,
}));
mock.module('@/shared/libs/confirm', () => ({ confirm: async () => true }));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheValue: () => null,
  useViewCacheRows: () => [],
}));
mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () =>
    createDateFormatter('es', {
      languageTag: 'es-PE',
      regionCode: 'PE',
      uses24hourClock: true,
      firstWeekday: 2,
      timeZone: null,
    }),
}));
mock.module('expo-router', () => ({
  useRouter: () => ({
    push: (href: unknown) => state.pushed.push(href),
    back: () => undefined,
    canGoBack: () => true,
    replace: () => undefined,
  }),
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/profile',
}));

const { default: SessionsScreen } = await import('@/features/sessions/screens/sessions-screen');
const { DevicesSection } = await import('@/features/sessions/components/devices-section');
const { default: PrivacyScreen } = await import('@/features/privacy/screens/privacy-screen');
const { CallPreferencesSection } =
  await import('@/features/voice/components/call-preferences-section');
const { default: ModulesScreen } = await import('@/features/modules/screens/modules-screen');
const { ModulesSwitchSection } =
  await import('@/features/modules/components/modules-switch-section');
const { ModuleRequestsSection } =
  await import('@/features/modules/components/module-requests-section');
const { ModuleSection } = await import('@/features/modules/components/module-rows');

beforeEach(() => {
  Object.assign(state, {
    sessions: [session('a', 'desktop', true), session('b', 'android', false)],
    answered: true,
    failed: false,
    closed: [],
    privacy: PRIVACY,
    privacyStatus: 'ready',
    choices: [],
    calls: CALLS,
    patches: [],
    modules: [
      moduleRecord({
        lifecycle: 'active',
        enabled: true,
        installedBytes: 2_000_000_000,
        summary: 'Cámaras y avisos',
      }),
      moduleRecord({ id: 'productivity', name: 'Productividad', lifecycle: 'disabled' }),
    ],
    toggled: [],
    requested: [],
    pushed: [],
  });
});

describe('Sesiones y dispositivos', () => {
  test('this device, the others with their close button, and the house it is paired to', () => {
    render(<SessionsScreen />);
    expect(screen.getByText('Escritorio de Ana')).toBeDefined();
    expect(screen.getByText('Teléfono Android')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar la sesión de Teléfono Android' }));
    fireEvent.click(screen.getByRole('button', { name: /^Cerrar las demás sesiones/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Cerrar sesión en todos/ }));
    expect(state.closed).toEqual(['b', 'others', 'all']);
    expect(screen.getByText('Argus en 192.168.1.40')).toBeDefined();
  });

  test('a failed list is a failure with Reintentar, never «sin sesiones»', () => {
    state.answered = false;
    state.failed = true;
    render(<SessionsScreen />);
    expect(screen.getByText('No se pudieron cargar tus sesiones.')).toBeDefined();
    expect(screen.queryByText('Solo tienes abierta esta sesión.')).toBeNull();
  });

  test('Tú lists the devices and opens the full screen', () => {
    render(<DevicesSection />);
    fireEvent.click(screen.getByRole('link', { name: 'Gestionar' }));
    expect(state.pushed).toEqual(['/profile/sessions']);
  });
});

describe('Privacidad', () => {
  test('each signal is a switch, and one the owner turned off says so and stays off', () => {
    render(<PrivacyScreen />);
    fireEvent.click(screen.getByRole('switch', { name: 'Presencia en casa' }));
    expect(state.choices).toEqual(['presence:false']);
    expect(screen.getByText(/El propietario lo apagó para toda la casa/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Términos de uso/ }));
    expect(screen.getByRole('dialog', { name: 'aviso' })).toBeDefined();
  });

  test('a failed read offers to retry', () => {
    state.privacy = null;
    state.privacyStatus = 'failed';
    render(<PrivacyScreen />);
    expect(screen.getByText('No se pudo cargar tu privacidad.')).toBeDefined();
  });
});

describe('Llamadas de Argus', () => {
  test('preferences use choices that never truncate, and switches save at once', () => {
    render(<CallPreferencesSection />);
    expect(screen.getByRole('radiogroup', { name: 'Una emergencia' })).toBeDefined();
    fireEvent.click(screen.getByRole('switch', { name: 'Argus puede llamarme' }));
    expect(state.patches).toEqual([{ enabled: false }]);
    fireEvent.click(screen.getByRole('button', { name: /^Duración del timbre|^Cuánto suena/ }));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  test('a failed read names what failed', () => {
    state.calls = null;
    render(<CallPreferencesSection />);
    expect(screen.getByText('No pude cargar tus preferencias de llamada')).toBeDefined();
  });
});

describe('Módulos', () => {
  test('a module switches through its lifecycle and offers to uninstall', () => {
    render(<ModulesScreen />);
    fireEvent.click(screen.getByRole('switch', { name: 'Vigilancia' }));
    fireEvent.click(screen.getByRole('button', { name: /^Desinstalar Vigilancia,/ }));
    expect(state.toggled).toEqual(['surveillance', 'remove:surveillance']);
  });

  test('Ajustes lists the modules with switches and a way to manage them', () => {
    render(<ModulesSwitchSection />);
    fireEvent.click(screen.getByRole('switch', { name: 'Productividad' }));
    fireEvent.click(screen.getByRole('button', { name: /^Gestionar módulos/ }));
    expect(state.toggled).toEqual(['productivity']);
    expect(state.pushed).toEqual(['/settings/modules']);
  });

  test('a module on its way shows its progress', () => {
    const job = {
      id: '1',
      kind: 'install',
      state: 'downloading',
      progress: 0.4,
      bytesDone: 4,
      bytesTotal: 10,
      bytesPerSecond: 1,
      etaSeconds: 6,
      reason: null,
      owner: null,
      roleMoves: [],
      roleMovesNote: null,
    } as const;
    const installing = moduleRecord({ job: { ...job, roleMoves: [] } });
    state.modules = [installing];
    render(
      <ModuleSection
        module={installing}
        switches={
          {
            catalog: null,
            modules: [installing],
            pending: null,
            busy: () => false,
            toggle: () => undefined,
            removeData: () => undefined,
            runJob: () => undefined,
          } as never
        }
      />
    );
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
  });

  test('someone who cannot manage modules asks for one', () => {
    state.modules = [moduleRecord({ summary: 'Cámaras y avisos' })];
    render(<ModuleRequestsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Pedirlo' }));
    expect(state.requested).toEqual(['surveillance']);
  });
});
