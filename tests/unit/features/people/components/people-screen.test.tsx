import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { IInvitationRecord, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { AuthSession, PresenceOverview } from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { hasCapability, isModuleActive } from '@/shared/libs/capabilities';
import type { AccessView } from '@/shared/libs/capabilities';
import { viewFor } from '@tests/support/access-fixtures';
import '../../../shared/ui/translation-stub';
import { setWindowSize } from '../../../shared/ui/window-width';

type State = {
  view: AccessView;
  self: number;
  users: IPeopleDirectoryCacheRow[];
  invitations: IInvitationRecord[];
  presence: PresenceOverview | null;
  sessions: AuthSession[];
  sessionsFailed: boolean;
  params: Record<string, string>;
  synced: boolean;
};

const NOW = new Date(2026, 9, 26, 12, 0).getTime();

const seconds = (ms: number) => Math.floor(ms / 1000);

const user = (
  id: string,
  name: string,
  lastName: string,
  patch: Partial<IPeopleDirectoryCacheRow> = {}
) => ({
  id,
  name,
  lastName,
  role: 'resident' as const,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
  ...patch,
});

const calls = {
  pushed: [] as unknown[],
  created: 0,
  revoked: [] as number[],
  optimistic: [] as unknown[],
};

const state: State = {
  view: viewFor('owner'),
  self: 1,
  users: [],
  invitations: [],
  presence: null,
  sessions: [],
  sessionsFailed: false,
  params: {},
  synced: true,
};

const dates = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: null,
});

mock.module('expo-router', () => ({
  useRouter: () => ({
    push: (href: unknown) => calls.pushed.push(href),
    back: () => calls.pushed.push('back'),
    replace: (href: unknown) => calls.pushed.push(href),
    canGoBack: () => true,
    setParams: () => undefined,
  }),
  useLocalSearchParams: () => state.params,
  useIsFocused: () => true,
}));
mock.module('@/core/stores', () => ({
  useAuthStore: Object.assign(
    <T,>(select: (value: { user: { id: number } }) => T) => select({ user: { id: state.self } }),
    { getState: () => ({ user: { id: state.self } }) }
  ),
  useLocaleStore: Object.assign(
    <T,>(select: (value: { language: string }) => T) => select({ language: 'es' }),
    { getState: () => ({ language: 'es' }) }
  ),
}));
mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: () => dates }));
mock.module('@/shared/hooks/use-now', () => ({ useNow: () => NOW }));
mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: (key: string) => (key === 'people.users' ? state.users : state.invitations),
  useViewCacheValue: () => state.synced,
}));
mock.module('@/shared/hooks/use-optimistic-rows', () => ({
  useOptimisticRows: <T,>(rows: readonly T[]) => ({ rows }),
}));
mock.module('@/shared/hooks/use-capabilities', () => ({
  useAccessView: () => state.view,
  useCapabilities: () => ({
    has: (capability: Parameters<typeof hasCapability>[1]) => hasCapability(state.view, capability),
    moduleActive: (moduleId: string) => isModuleActive(state.view, moduleId),
  }),
}));
mock.module('@/shared/hooks/use-remote-resource', () => ({
  useRemoteResource: ({ cacheKey }: { cacheKey: string }) => ({
    data: cacheKey === 'guard.presence' ? state.presence : null,
    status: 'ready',
    reload: () => Promise.resolve(),
    mutate: () => undefined,
  }),
}));
mock.module('@/shared/libs/optimistic-action', () => ({
  runOptimistic: (action: unknown) => {
    calls.optimistic.push(action);
    return Promise.resolve({ ok: true, info: null });
  },
}));
mock.module('@/core/services/sync', () => ({
  synchronizeService: { syncOnce: () => Promise.resolve() },
}));
mock.module('@/core/services/net', () => ({
  netService: {
    instance: () =>
      Promise.resolve({
        host: 'casa.local',
        ip: '192.168.1.2',
        port: 7042,
        instanceId: 'i',
        caFingerprint: 'f',
      }),
  },
}));
mock.module('@/core/services/invite', () => ({
  inviteService: {
    create: () => {
      calls.created += 1;
      return new Promise((resolve) =>
        globalThis.setTimeout(
          () =>
            resolve({
              ok: true,
              info: {
                id: 106,
                token: 'a'.repeat(40),
                role: 'resident',
                maxRedemptions: 1,
                redemptionCount: 0,
                expiresAt: seconds(NOW) + 900,
                createdBy: 1,
                revokedAt: null,
                createdAt: seconds(NOW),
              },
            }),
          5
        )
      );
    },
    revoke: (id: number) => {
      calls.revoked.push(id);
      return Promise.resolve({ ok: true });
    },
  },
}));
mock.module('@/features/people/services/user-management.service', () => ({
  userManagementService: {
    update: () => Promise.resolve({ ok: true }),
    eraseBiometrics: () => Promise.resolve({ ok: true }),
  },
}));
mock.module('@/features/people/services/presence.service', () => ({ presenceService: {} }));
mock.module('@/features/people/services/voiceprint.service', () => ({ voiceprintService: {} }));
mock.module('@/features/people/services/portrait-preview.service', () => ({
  portraitPreviewService: {},
}));
mock.module('@/shared/libs/toast', () => ({
  toast: { success: () => undefined, error: () => undefined, info: () => undefined },
}));
mock.module('@/shared/libs/service-error', () => ({ toastServiceError: () => undefined }));
mock.module('@/shared/hooks/use-service-action', () => ({
  useServiceAction: () => ({ run: () => Promise.resolve(null), pending: false }),
}));
mock.module('@/core/services/view-cache.service', () => ({ viewCacheService: {} }));
mock.module('@/shared/components/ui/lazy-qr-code', () => ({
  LazyQrCode: () => <span>qr-code</span>,
}));
mock.module('@/features/privacy', () => ({
  HouseholdPrivacyPanel: () => <span>household-privacy</span>,
  UserPrivacyRow: () => <span>user-privacy</span>,
  MinorRow: () => <span>minor-row</span>,
}));
mock.module('@/features/sessions', () => ({
  SESSION_PLATFORM_GLYPHS: {
    android: 'phone',
    ios: 'phone',
    desktop: 'devices',
    web: 'globe',
    unknown: 'devices',
  },
  useSessionLabels: () => ({
    nameOf: (session: AuthSession) => session.deviceName ?? 'Teléfono',
    platformOf: () => 'Android',
    activityLabel: () => 'Ahora',
    sinceLabel: () => '',
  }),
  useConnectedDevices: () => ({
    now: seconds(NOW),
    sessionsOf: () => [],
    closeSession: () => Promise.resolve(),
    closeEverySession: () => Promise.resolve(),
    forget: () => undefined,
    reload: () => Promise.resolve(),
  }),
  useUserSessions: () => ({
    sessions: state.sessions,
    loading: false,
    failed: state.sessionsFailed,
    reload: () => Promise.resolve(),
  }),
}));

const { default: PeopleScreen } = await import('@/features/people/screens/people-screen');
const { InvitationsSection } = await import('@/features/people/components/invitations-section');
const { InvitationQrSheet, InviteSheet } =
  await import('@/features/people/components/invite-sheets');
const { PanesPeople, PhonePeople, PhonePerson } =
  await import('@/features/people/components/people-layouts');
const { PeopleList } = await import('@/features/people/components/people-list');
const { PersonDetail, PersonHead } = await import('@/features/people/components/person-detail');
const { PersonRow } = await import('@/features/people/components/person-row');
const { DangerSection, PortraitSection, PrivacySection, VoiceSection } =
  await import('@/features/people/components/person-sections');
const { PersonSessions } = await import('@/features/people/components/person-sessions');
const { PersonSheet } = await import('@/features/people/components/person-sheet');

const parts = [
  InvitationsSection,
  InvitationQrSheet,
  InviteSheet,
  PanesPeople,
  PhonePeople,
  PhonePerson,
  PeopleList,
  PersonDetail,
  PersonHead,
  PersonRow,
  DangerSection,
  PortraitSection,
  PrivacySection,
  VoiceSection,
  PersonSessions,
  PersonSheet,
];

const flush = () => act(() => new Promise((resolve) => globalThis.setTimeout(resolve, 20)));

const session: AuthSession = {
  id: 's1',
  platform: 'android',
  deviceName: 'Galaxy de Luis',
  current: false,
  createdAt: seconds(NOW) - 3600,
  lastSeenAt: seconds(NOW) - 60,
  expiresAt: seconds(NOW) + 3600,
} as AuthSession;

beforeEach(() => {
  calls.pushed = [];
  calls.created = 0;
  calls.revoked = [];
  calls.optimistic = [];
  Object.assign(state, {
    view: viewFor('owner'),
    self: 1,
    users: [
      user('1', 'Ana', 'Ruiz', { role: 'owner' }),
      user('3', 'Luis', 'Paz'),
      user('4', 'Beto', 'Soto', { isActive: false, role: 'guest' }),
    ],
    invitations: [
      {
        id: 50,
        role: 'guard',
        maxRedemptions: 1,
        redemptionCount: 0,
        expiresAt: seconds(new Date(2026, 9, 26, 14, 30).getTime()),
        createdBy: 1,
        revokedAt: null,
        createdAt: seconds(NOW),
      },
      {
        id: 51,
        role: 'guest',
        maxRedemptions: 1,
        redemptionCount: 1,
        expiresAt: seconds(NOW),
        createdBy: 1,
        revokedAt: null,
        createdAt: seconds(NOW),
      },
      {
        id: 52,
        role: 'resident',
        maxRedemptions: 1,
        redemptionCount: 0,
        expiresAt: seconds(NOW),
        createdBy: 1,
        revokedAt: seconds(NOW),
        createdAt: seconds(NOW),
      },
    ],
    presence: {
      people: [
        {
          userId: 1,
          state: 'home',
          since: seconds(new Date(2026, 9, 26, 9, 10).getTime()),
          environments: [],
        },
        {
          userId: 3,
          state: 'away',
          since: seconds(new Date(2026, 9, 26, 8, 5).getTime()),
          environments: [],
        },
      ],
    },
    sessions: [],
    sessionsFailed: false,
    params: {},
    synced: true,
  });
});

afterEach(() => setWindowSize(360, 800));

describe('Personas for the owner on a phone', () => {
  test('one flat row per person: role and where they are, in words', () => {
    render(<PeopleScreen />);
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeDefined();
    expect(screen.getByText('Ana Ruiz (tú)')).toBeDefined();
    expect(screen.getByText('Propietario · en casa desde 09:10')).toBeDefined();
    expect(screen.getByText('Residente · fuera desde 08:05')).toBeDefined();
    expect(screen.getByText('Invitado · cuenta desactivada')).toBeDefined();
    fireEvent.click(screen.getByTestId('person-row-3'));
    expect(calls.pushed).toEqual([{ pathname: '/people/[id]', params: { id: '3' } }]);
  });

  test('invitations sit below with their state, and a pending one can be revoked after Confirm', async () => {
    render(<PeopleScreen />);
    expect(screen.getByText('Invitaciones')).toBeDefined();
    expect(screen.getByText('Pendiente · vale hasta las 14:30')).toBeDefined();
    expect(screen.getByText(/^Usada · creada el/)).toBeDefined();
    expect(screen.queryByTestId('invitation-row-52')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver anteriores (1)' }));
    expect(screen.getByTestId('invitation-row-52')).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'Revocar la invitación para Invitado' })
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Revocar la invitación para Guardia' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Revocar' }));
    await flush();
    expect(calls.optimistic).toHaveLength(1);
  });

  test('Invitar creates one invitation however often it is pressed, and shows its QR', async () => {
    render(<PeopleScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Invitar' }));
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Nueva invitación' });
    const create = within(sheet).getByRole('button', { name: 'Crear y mostrar QR' });
    fireEvent.click(create);
    fireEvent.click(create);
    await flush();
    await flush();
    expect(calls.created).toBe(1);
    expect(screen.getByRole('dialog', { name: 'Invitación lista' })).toBeDefined();
    expect(
      screen.getByRole('img', { name: 'Código QR de la invitación para Residente' })
    ).toBeDefined();
    expect(document.body.textContent?.includes('a'.repeat(40))).toBe(false);
  });

  test('a link from Tú opens the invitation sheet at once', async () => {
    state.params = { invite: '1' };
    render(<PeopleScreen />);
    await flush();
    expect(screen.getByRole('dialog', { name: 'Nueva invitación' })).toBeDefined();
  });
});

describe('a person, pushed on a phone', () => {
  test('access, sessions and, at the bottom, Desactivar cuenta behind a Confirm', async () => {
    state.params = { id: '3' };
    state.sessions = [session];
    render(<PeopleScreen />);
    expect(screen.getByText('Acceso')).toBeDefined();
    expect(screen.getByText(/^Gestiona/)).toBeDefined();
    expect(screen.getByText('Galaxy de Luis')).toBeDefined();
    expect(screen.getByText('user-privacy')).toBeDefined();
    expect(screen.getByText('minor-row')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^Desactivar cuenta/ }));
    await flush();
    expect(screen.getByText('¿Desactivar la cuenta de Luis Paz?')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar cuenta' }));
    await flush();
    expect(calls.optimistic).toHaveLength(1);
  });

  test('sessions that failed to load never read as «Sin sesiones abiertas»', () => {
    state.params = { id: '3' };
    state.sessionsFailed = true;
    render(<PeopleScreen />);
    expect(screen.getByText('No pude cargar sus sesiones')).toBeDefined();
    expect(screen.queryByText('Sin sesiones abiertas.')).toBeNull();
  });

  test('my own detail offers no deactivation; the access row edits name and role', async () => {
    state.params = { id: '1' };
    render(<PeopleScreen />);
    expect(screen.queryByRole('button', { name: /^Desactivar cuenta/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Propietario,/ }));
    await flush();
    const sheet = screen.getByRole('dialog', { name: 'Editar persona' });
    expect(within(sheet).queryByText('Rol')).toBeNull();
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Nombre' }), {
      target: { value: '' },
    });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }));
    await flush();
    expect(within(sheet).getByText('Escribe su nombre.')).toBeDefined();
  });

  test('an id nobody has says so once the sync settled', () => {
    state.params = { id: '99' };
    render(<PeopleScreen />);
    expect(screen.getByText('Esta persona ya no está')).toBeDefined();
  });
});

describe('Personas for a guard', () => {
  test('the directory without invitations, presence or visitors', () => {
    state.view = viewFor('guard');
    state.self = 7;
    state.presence = null;
    render(<PeopleScreen />);
    expect(screen.getByText('Ana Ruiz')).toBeDefined();
    expect(screen.getByText('Propietario')).toBeDefined();
    expect(screen.queryByText('Invitaciones')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Invitar' })).toBeNull();
    expect(screen.queryByText('household-privacy')).toBeNull();
    expect(screen.queryByText('Personas vistas')).toBeNull();
  });

  test('a guard opening a person sees the portrait check and nothing to manage', () => {
    state.view = viewFor('guard');
    state.self = 7;
    state.params = { id: '3' };
    render(<PeopleScreen />);
    expect(screen.getByText('Verificar su retrato')).toBeDefined();
    expect(screen.queryByText('Sesiones')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Desactivar cuenta/ })).toBeNull();
  });
});

describe('Personas on wider screens', () => {
  test('a tablet keeps the list and pushes a person, so the detail is never cramped', () => {
    setWindowSize(768, 1024);
    render(<PeopleScreen />);
    fireEvent.click(screen.getByTestId('person-row-3'));
    expect(calls.pushed).toEqual([{ pathname: '/people/[id]', params: { id: '3' } }]);
  });

  test('the list sits beside the first person, and a row swaps the detail in place', () => {
    setWindowSize(1440, 900);
    render(<PeopleScreen />);
    expect(screen.getByLabelText('Personas de la casa')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Ana Ruiz (tú)' })).toBeDefined();
    fireEvent.click(screen.getByTestId('person-row-3'));
    expect(screen.getByRole('heading', { name: 'Luis Paz' })).toBeDefined();
    expect(calls.pushed).toEqual([]);
    expect(parts.every((part) => typeof part === 'function')).toBe(true);
  });
});
