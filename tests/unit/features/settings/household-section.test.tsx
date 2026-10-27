import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { IServiceResponse } from '@/core/interfaces';
import type { Setting, SettingChange, SettingsOwner, SettingsUpdateResult } from '@/core/types';
import { setWindowWidth } from '../../shared/ui/window-width';
import '../../shared/ui/translation-stub';

type Update = { owner: string; changes: readonly SettingChange[] };

const homeName = (value: string): Setting => ({
  key: 'identity.home_name',
  group: 'household',
  type: 'text',
  level: 'basic',
  apply: 'live',
  min: 0,
  max: 0,
  step: 0,
  choices: [],
  value,
  fallback: '',
});

const catalog = (value: string): SettingsOwner => ({
  service: 'identity',
  reachable: true,
  configured: true,
  settings: [homeName(value)],
});

const state = {
  updates: [] as Update[],
  catalogs: [] as SettingsOwner[],
  toasts: [] as string[],
  answer: null as IServiceResponse<SettingsUpdateResult> | null,
  release: null as (() => void) | null,
};

const answered = (value: string): IServiceResponse<SettingsUpdateResult> => ({
  ok: true,
  status: 200,
  info: { applied: ['identity.home_name'], catalog: catalog(value) },
  errors: null,
});

mock.module('@/features/settings/services/settings.service', () => ({
  settingsService: {
    update: (owner: string, changes: readonly SettingChange[]) => {
      state.updates.push({ owner, changes });
      return new Promise((resolve) => {
        state.release = () => resolve(state.answer ?? answered(changes[0]?.value ?? ''));
      });
    },
  },
}));
mock.module('@/shared/libs/service-error', () => ({
  toastServiceError: (error: { code: string } | null) => void state.toasts.push(error?.code ?? ''),
}));

const { HouseholdSection } = await import('@/features/settings/components/household-section');

const onCatalog = (catalogs: readonly SettingsOwner[]) => void state.catalogs.push(...catalogs);

const open = (value: string) => {
  render(<HouseholdSection setting={homeName(value)} onCatalog={onCatalog} />);
  fireEvent.click(screen.getByRole('button', { name: /^Nombre de la casa/ }));
};

const type = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText('Casa Acme'), { target: { value: text } });

const release = async () => {
  await act(async () => {
    state.release?.();
    await Promise.resolve();
  });
};

beforeEach(() => {
  setWindowWidth(360);
  Object.assign(state, { updates: [], catalogs: [], toasts: [], answer: null, release: null });
});

describe('the home name in Ajustes', () => {
  test('the row shows the name, or says there is none', () => {
    render(<HouseholdSection setting={homeName('Casa Acme')} onCatalog={onCatalog} />);
    expect(screen.getByText('Casa')).toBeDefined();
    expect(screen.getByText('Casa Acme')).toBeDefined();
  });

  test('an unset name reads as such, and an absent setting shows nothing', () => {
    const { unmount } = render(<HouseholdSection setting={homeName('')} onCatalog={onCatalog} />);
    expect(screen.getByText('Sin nombre')).toBeDefined();
    unmount();
    const { container } = render(<HouseholdSection setting={null} onCatalog={onCatalog} />);
    expect(container.textContent).toBe('');
  });

  test('saving sends the tidy name once, even when pressed twice, and keeps the answer', async () => {
    open('');
    type('  Casa   Acme ');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await release();
    expect(state.updates).toEqual([
      { owner: 'identity', changes: [{ key: 'identity.home_name', value: 'Casa Acme' }] },
    ]);
    expect(state.catalogs.map((owner) => owner.settings[0]?.value)).toEqual(['Casa Acme']);
  });

  test('a name the app can already refuse is said under the field without a call', () => {
    open('Casa');
    type('a'.repeat(41));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getByRole('alert').textContent).toContain('hasta 40 caracteres');
    expect(state.updates).toEqual([]);
  });

  test('the server refusal lands on the field, and another failure is a toast', async () => {
    open('Casa');
    type('Casa Acme');
    state.answer = {
      ok: false,
      status: 422,
      info: null,
      errors: {
        code: 'VALIDATION_ERROR',
        message: 'x',
        fields: { 'identity.home_name': ['invalid'] },
      },
    };
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await release();
    expect(screen.getByRole('alert').textContent).toContain('sin saltos de línea');
    expect(state.toasts).toEqual([]);

    state.answer = {
      ok: false,
      status: 503,
      info: null,
      errors: { code: 'SERVICE_UNAVAILABLE', message: 'x' },
    };
    type('Casa Acme 2');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await release();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(state.toasts).toEqual(['SERVICE_UNAVAILABLE']);
    expect(state.catalogs).toEqual([]);
  });
});
