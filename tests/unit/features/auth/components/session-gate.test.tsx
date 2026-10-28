import { describe, expect, mock, test } from 'bun:test';
import { act, render, screen, waitFor } from '@testing-library/react';

let finishInit: () => void = () => undefined;

mock.module('@/core/services/session.service', () => ({
  sessionService: {
    isInitialized: false,
    initialize: () =>
      new Promise<void>((resolve) => {
        finishInit = resolve;
      }),
    refreshSession: async () => undefined,
    clearSession: async () => undefined,
    updateUser: () => undefined,
    endSession: async () => undefined,
  },
}));

mock.module('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'es-PE', languageCode: 'es' }],
}));

mock.module('expo-splash-screen', () => ({
  preventAutoHideAsync: async () => undefined,
  hideAsync: async () => undefined,
}));

mock.module('@/core/services/sync', () => ({ synchronizeService: { bind: () => undefined } }));

const { SessionGate } = await import('@/features/auth/components/session-gate');
const { useLocaleStore } = await import('@/core/stores/locale.store');
const { dictionaryLoaded, setLanguage } = await import('@/core/i18n');
const { useTranslation } = await import('@/shared/hooks/use-translation');

const ENGLISH = 'App language';
const SPANISH = 'Idioma de la aplicación';

function Probe({ painted }: { painted: string[] }) {
  const { t } = useTranslation();
  const text = t('screens.profile.language-label');
  painted.push(text);
  return <div>{text}</div>;
}

describe('the session gate and the lazy English dictionary', () => {
  test('an English install paints its splash in English and its first screen only in English', async () => {
    useLocaleStore.setState({ preference: 'en', language: 'en' });
    const painted: string[] = [];
    render(
      <SessionGate>
        <Probe painted={painted} />
      </SessionGate>
    );
    expect(screen.getByLabelText('Loading')).toBeTruthy();
    expect(painted).toEqual([]);
    act(() => finishInit());
    await waitFor(() => expect(screen.getByText(ENGLISH)).toBeTruthy());
    expect(dictionaryLoaded('en')).toBe(true);
    expect(new Set(painted)).toEqual(new Set([ENGLISH]));
  });

  test('switching language never paints a key or the other language early', async () => {
    useLocaleStore.setState({ preference: 'es', language: 'es' });
    const painted: string[] = [];
    render(<Probe painted={painted} />);
    expect(screen.getByText(SPANISH)).toBeTruthy();
    act(() => setLanguage('en'));
    await waitFor(() => expect(screen.getByText(ENGLISH)).toBeTruthy());
    expect(painted.every((text) => text === SPANISH || text === ENGLISH)).toBe(true);
    act(() => {
      setLanguage('en');
      setLanguage('es');
    });
    await waitFor(() => expect(useLocaleStore.getState().language).toBe('es'));
  });
});
