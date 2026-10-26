import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate, translateLoose } from '@/core/i18n/translate';
import type {
  Setting,
  SettingChange,
  SettingsOwner,
  SettingsProfiles,
  TranslateFn,
} from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { setWindowWidth } from '../../shared/ui/window-width';
import '../../shared/ui/translation-stub';

type Applied = { owner: string; changes: SettingChange[] };

const setting = (key: string, patch: Partial<Setting> = {}): Setting => ({
  key,
  group: 'g',
  type: 'choice',
  level: 'basic',
  apply: 'live',
  min: 0,
  max: 0,
  step: 0,
  choices: [],
  value: '',
  fallback: '',
  ...patch,
});

const TTS: SettingsOwner = {
  service: 'tts',
  reachable: true,
  configured: true,
  settings: [
    setting('tts.engine_es', {
      choices: ['pocket', 'supertonic'],
      value: 'pocket',
      fallback: 'pocket',
      choiceStates: [
        { choice: 'pocket', availability: 'installed', sizeMb: 180, hostCommand: '' },
        { choice: 'supertonic', availability: 'installable', sizeMb: 320, hostCommand: '' },
      ],
    }),
    setting('tts.speed', {
      type: 'decimal',
      min: 0.5,
      max: 2,
      step: 0.1,
      value: '1.2',
      fallback: '1',
    }),
    setting('tts.threads', {
      type: 'integer',
      level: 'advanced',
      min: 0,
      max: 64,
      step: 1,
      value: '4',
      fallback: '0',
      pendingRestart: true,
    }),
    setting('tts.normalize_text', {
      type: 'toggle',
      level: 'advanced',
      value: 'true',
      fallback: 'true',
    }),
  ],
};

const STT: SettingsOwner = { service: 'stt', reachable: false, configured: true, settings: [] };

const PROFILES = {
  profiles: ['performance', 'balanced', 'quality'].map((id) => ({
    id,
    labelKey: id,
    current: id === 'balanced',
    owners: [
      {
        service: 'tts',
        reachable: true,
        changes: [{ key: 'tts.speed', from: '1', to: '1.2', changed: true }],
      },
    ],
  })),
  recommendation: {
    profile: 'balanced',
    reason: 'meets',
    hardware: { cores: 8, threads: 16, ramGb: 32, isa: 'avx2', gpu: 'none' },
    rule: null,
    missed: null,
    rules: [],
    fallback: 'performance',
  },
  firstRun: null,
} as unknown as SettingsProfiles;

const state = {
  owners: [TTS, STT] as SettingsOwner[],
  failed: false,
  applied: [] as Applied[],
  profiles: [] as string[],
  pushed: [] as unknown[],
  service: undefined as string | undefined,
  reloads: 0,
  toasts: [] as string[],
  haptics: true,
};

const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

mock.module('@/core/i18n', () => ({
  t,
  tk: (key: string) => translateLoose(localeDictionaries.es, key),
}));
mock.module('@/features/settings/hooks/use-settings-hub', () => ({
  useSettingsHub: () => ({
    settings: { failed: state.failed, reload: async () => void (state.reloads += 1) },
    profiles: {
      profiles: PROFILES,
      failed: false,
      reload: async () => undefined,
      apply: async (profile: { id: string }) => void state.profiles.push(profile.id),
      revert: async () => undefined,
      reverting: false,
    },
    owners: state.owners,
    change: (owner: SettingsOwner, changes: SettingChange[]) =>
      state.applied.push({ owner: owner.service, changes }),
  }),
}));
mock.module('@/features/settings/hooks/use-voice-preview', () => ({
  useVoicePreview: () => ({ playing: null, toggle: () => undefined }),
}));
mock.module('@/features/settings/hooks/use-desktop-autostart', () => ({
  useDesktopAutostart: () => ({
    enabled: false,
    status: 'idle',
    error: null,
    change: () => undefined,
  }),
}));
mock.module('@/features/modules', () => ({ ModulesSwitchSection: () => <div>módulos</div> }));
mock.module('@/features/profile', () => ({
  useAppearanceLine: () => 'Sistema · efectos completos',
}));
mock.module('@/shared/hooks/use-device-preferences', () => ({
  useDevicePreferences: () => ({
    reduceEffects: false,
    haptics: state.haptics,
    setReduceEffects: () => undefined,
    setHaptics: (next: boolean) => void (state.haptics = next),
  }),
}));
mock.module('@/shared/libs/toast', () => ({
  toast: {
    success: (title: string) => void state.toasts.push(title),
    error: (title: string) => void state.toasts.push(title),
  },
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
  useLocalSearchParams: () => ({ service: state.service }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/settings',
}));

const { default: SettingsScreen } = await import('@/features/settings/screens/settings-screen');
const { DeviceSection } = await import('@/features/settings/components/device-section');
const { HowCard } = await import('@/features/settings/components/how-card');
const { ServiceDetail } = await import('@/features/settings/components/service-detail');
const { SearchResults, ServicesSection } =
  await import('@/features/settings/components/services-section');
const { SettingRow } = await import('@/features/settings/components/setting-row');
const { SettingSheet } = await import('@/features/settings/components/setting-sheet');
const { TransferSheet } = await import('@/features/settings/components/transfer-sheet');
const { VoiceCards } = await import('@/features/settings/components/voice-cards');

beforeEach(() => {
  setWindowWidth(360);
  Object.assign(state, {
    owners: [TTS, STT],
    failed: false,
    applied: [],
    profiles: [],
    pushed: [],
    service: undefined,
    reloads: 0,
    toasts: [],
    haptics: true,
  });
});

describe('Ajustes on a phone', () => {
  test('the hub tells how Argus works, lists the services in words and pushes one open', () => {
    render(<SettingsScreen />);
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeDefined();
    expect(screen.getByText('Cómo trabaja Argus')).toBeDefined();
    expect(screen.getByText('Equilibrado · recomendado para este equipo')).toBeDefined();
    expect(screen.getByText('No responde · Reintentar')).toBeDefined();
    expect(screen.queryByText('tts')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Voz de Argus/ }));
    expect(state.pushed).toEqual([{ pathname: '/settings/[service]', params: { service: 'tts' } }]);
  });

  test('choosing another profile applies it with a way back', () => {
    setWindowWidth(1440);
    render(
      <HowCard
        profiles={
          {
            profiles: PROFILES,
            failed: false,
            reload: async () => undefined,
            apply: async (profile: { id: string }) => void state.profiles.push(profile.id),
            revert: async () => undefined,
            reverting: false,
          } as never
        }
      />
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Máxima calidad' }));
    expect(state.profiles).toEqual(['quality']);
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
  });

  test('the search finds an option by its words and opens its service', () => {
    render(<SettingsScreen />);
    fireEvent.change(screen.getByPlaceholderText('Buscar un ajuste'), {
      target: { value: 'velocidad' },
    });
    expect(screen.getByText('Ajustes que coinciden')).toBeDefined();
    expect(screen.queryByText('Cómo trabaja Argus')).toBeNull();
  });

  test('a service opens as its own screen with its main choices', () => {
    state.service = 'tts';
    render(<SettingsScreen />);
    expect(screen.getByRole('heading', { name: 'Voz de Argus' })).toBeDefined();
    expect(screen.getByRole('radio', { name: /Supertonic/ })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Opciones avanzadas · 2' }));
    expect(screen.getByText('tts.threads')).toBeDefined();
  });

  test('a service that does not answer names itself and offers to retry', () => {
    render(
      <ServiceDetail
        owner={STT}
        onChange={() => undefined}
        onRetry={() => void (state.reloads += 1)}
      />
    );
    expect(screen.getByText('Oído no responde')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(state.reloads).toBe(1);
  });

  test('a failed read says so and retries', () => {
    state.owners = [];
    state.failed = true;
    render(<SettingsScreen />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]!);
    expect(state.reloads).toBe(1);
  });
});

describe('Ajustes with panes', () => {
  test('a laptop shows the hub and the first service side by side', () => {
    setWindowWidth(1440);
    render(<SettingsScreen />);
    expect(screen.getByLabelText('Ajustes')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Voz de Argus' })).toBeDefined();
    expect(screen.getByText('Opciones avanzadas')).toBeDefined();
  });
});

describe('the controls', () => {
  test('a voice card chooses its voice with a way back', () => {
    const chosen: string[] = [];
    render(
      <VoiceCards
        setting={TTS.settings[0]!}
        siblings={TTS.settings}
        preview={{ playing: null, toggle: () => undefined }}
        onChange={(value) => chosen.push(value)}
      />
    );
    fireEvent.click(screen.getByRole('radio', { name: /Supertonic/ }));
    expect(chosen).toEqual(['supertonic']);
    expect(state.toasts).toHaveLength(1);
  });

  test('a stepper moves within its range, and a toggle switches', () => {
    const changes: string[] = [];
    render(
      <>
        <SettingRow
          setting={TTS.settings[1]!}
          onChange={(value) => changes.push(value)}
          onOpen={() => undefined}
        />
        <SettingRow
          setting={TTS.settings[3]!}
          onChange={(value) => changes.push(value)}
          onOpen={() => undefined}
        />
      </>
    );
    fireEvent.click(screen.getAllByRole('switch')[0]!);
    expect(changes).toEqual(['false']);
    expect(screen.getByRole('button', { name: /^Subir/ })).toBeDefined();
  });

  test('an advanced option edits its value, and resets to the factory value', () => {
    const changes: string[] = [];
    render(
      <SettingSheet
        setting={TTS.settings[2]!}
        onChange={(_key, value) => changes.push(value)}
        onClose={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Volver a/ }));
    expect(changes).toEqual(['0']);
  });

  test('an import shows what it would change before applying', () => {
    render(
      <TransferSheet
        transfer={{ owner: TTS, mode: 'import' }}
        onApply={() => undefined}
        onClose={() => undefined}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{ not json' } });
    expect(screen.getByText('No es un JSON válido.')).toBeDefined();
  });

  test('the device rows open Apariencia and switch the vibration', () => {
    render(<DeviceSection />);
    fireEvent.click(screen.getByRole('switch', { name: 'Vibrar al confirmar' }));
    expect(state.haptics).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /^Apariencia/ }));
    expect(state.pushed).toEqual(['/profile/appearance']);
  });

  test('the services list and an empty search say what they found', () => {
    const opened: string[] = [];
    render(
      <>
        <ServicesSection
          owners={[TTS]}
          selected="tts"
          onOpen={(owner) => opened.push(owner.service)}
        />
        <SearchResults query="nada" matches={[]} onOpen={() => undefined} />
      </>
    );
    expect(screen.getByText('1 activo')).toBeDefined();
    expect(screen.getByText('Ningún ajuste coincide con «nada»')).toBeDefined();
  });
});
