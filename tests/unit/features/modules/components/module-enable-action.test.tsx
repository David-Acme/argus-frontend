import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ModuleJob } from '@/core/types';
import '../../../shared/ui/translation-stub';

const state = {
  manages: true,
  active: false,
  job: null as ModuleJob | null,
  installed: [] as string[],
  ok: true,
};

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ has: () => state.manages, moduleActive: () => state.active }),
}));
mock.module('@/features/modules/hooks/use-module-catalog', () => ({
  useModuleCatalog: () => ({
    modules: [{ id: 'productivity', name: 'Productividad', job: state.job }],
  }),
}));
mock.module('@/shared/hooks/use-service-action', () => ({
  useServiceAction: () => ({
    run: async ({ call }: { call: () => Promise<unknown> }) => {
      await call();
      return state.ok ? { ok: true } : null;
    },
    pending: false,
  }),
}));
mock.module('@/core/services/modules', () => ({
  moduleEngine: {
    act: async (moduleId: string) => {
      state.installed.push(moduleId);
      return { ok: state.ok };
    },
  },
}));

const { ModuleEnableAction } = await import('@/features/modules/components/module-enable-action');

afterEach(() => {
  Object.assign(state, { manages: true, active: false, job: null, installed: [], ok: true });
});

describe('ModuleEnableAction', () => {
  test('«Activar» turns the module on and then counts as done', async () => {
    let done = 0;
    render(<ModuleEnableAction moduleId="productivity" onDone={() => (done += 1)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    });
    expect(state.installed).toEqual(['productivity']);
    expect(done).toBe(1);
  });

  test('«Ahora no» is done without turning anything on', () => {
    let done = 0;
    render(<ModuleEnableAction moduleId="productivity" onDone={() => (done += 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(done).toBe(1);
    expect(state.installed).toEqual([]);
  });

  test('a refused install is not done', async () => {
    let done = 0;
    state.ok = false;
    render(<ModuleEnableAction moduleId="productivity" onDone={() => (done += 1)} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    });
    expect(done).toBe(0);
  });

  test('while it installs it says so and offers no «Ahora no»', () => {
    state.job = {
      id: 'j1',
      kind: 'install',
      state: 'downloading',
      progress: 0.4,
      bytesDone: 40,
      bytesTotal: 100,
      bytesPerSecond: 10,
      etaSeconds: 6,
      reason: null,
      owner: null,
      roleMoves: [],
      roleMovesNote: null,
    };
    render(<ModuleEnableAction moduleId="productivity" />);
    expect(screen.getByRole('button', { name: 'Activando…' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Ahora no' })).toBeNull();
  });

  test('nothing for someone who cannot manage modules, or for a module already on', () => {
    state.manages = false;
    const refused = render(<ModuleEnableAction moduleId="productivity" />);
    expect(refused.container.textContent).toBe('');
    refused.unmount();
    state.manages = true;
    state.active = true;
    const active = render(<ModuleEnableAction moduleId="productivity" />);
    expect(active.container.textContent).toBe('');
  });
});
