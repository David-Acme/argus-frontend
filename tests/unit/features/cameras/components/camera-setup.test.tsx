import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ICameraCatalogModel, ICameraProbeResult } from '@/core/interfaces';
import { screenFocus } from '../../../shared/ui/screen-focus';
import '../../../shared/ui/translation-stub';
import { cameraRow } from './camera-fixtures';

const writes: string[] = [];

const REQUIRED = 'common.validation.required';

let probeAnswer: { ok: boolean; info?: ICameraProbeResult };

const MODEL: ICameraCatalogModel = {
  id: 'tapo-c210',
  brand: 'TP-Link Tapo',
  manufacturer: 'TP-Link',
  model: 'C210',
  driver: 'tapo',
  formFactor: 'pan-tilt',
  outdoor: false,
  generic: false,
  resolution: '2304x1296',
  subResolution: '640x360',
  defaults: {
    port: 554,
    onvifPort: 2020,
    username: 'admin',
    streamPath: '/stream1',
    subStreamPath: '/stream2',
  },
  features: {
    ptz: true,
    presets: true,
    autoTrack: false,
    microphone: true,
    speaker: true,
    siren: false,
    privacy: true,
    led: true,
    dayNight: true,
    motion: true,
    sdCard: true,
  },
  note: '',
};

const RESULT: ICameraProbeResult = {
  ok: true,
  steps: [{ id: 'network', status: 'ok', code: '', detail: '' }],
  stream: { videoCodec: 'h264', audioCodec: '', width: 2304, height: 1296 },
  device: { model: 'C210', firmware: '1.3.4' },
  catalogId: 'tapo-c210',
};

mock.module('expo-router', () => ({
  useIsFocused: () => screenFocus.focused,
  useRouter: () => ({ push: () => undefined }),
}));

mock.module('@/features/cameras/hooks/use-camera-catalog', () => ({
  useCameraCatalog: () => ({
    models: [MODEL],
    loading: false,
    failed: false,
    reload: async () => undefined,
  }),
}));

mock.module('@/features/cameras/services/camera-control.service', () => ({
  cameraControlService: { probe: async () => probeAnswer },
}));

mock.module('@/core/services/camera.service', () => ({
  cameraService: {
    update: async () => {
      writes.push('update');
      return { ok: true };
    },
    create: async () => {
      writes.push('create');
      return { ok: true };
    },
  },
}));

mock.module('@/core/services/http', () => ({ newIdempotencyKey: () => 'key' }));

mock.module('@/shared/libs/service-error', () => ({ toastServiceError: () => undefined }));

mock.module('@/shared/libs/optimistic-action', () => ({
  runOptimistic: async (action: { call: (key: string) => Promise<unknown> }) => action.call('key'),
}));

const { CameraForm } = await import('@/features/cameras/components/camera-form');
const { ProbeStep } = await import('@/features/cameras/components/camera-setup/probe-step');
const { ModelStep } = await import('@/features/cameras/components/camera-setup/model-step');
const { ConnectionStep } =
  await import('@/features/cameras/components/camera-setup/connection-step');
const { DetailsStep } = await import('@/features/cameras/components/camera-setup/details-step');
const { SetupField } = await import('@/features/cameras/components/camera-setup/setup-field');

afterEach(() => {
  writes.length = 0;
  probeAnswer = { ok: true, info: RESULT };
});

describe('the camera setup sheet', () => {
  test('edits in three steps with one primary action and no Cancelar', async () => {
    probeAnswer = { ok: true, info: RESULT };
    let closed = 0;
    render(
      <CameraForm
        open
        camera={cameraRow({ cloudUsername: 'ana@example.com' })}
        onOpenChange={() => (closed += 1)}
      />
    );
    expect(screen.getByText('Paso 1 de 3: Conexión')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull();
    expect(screen.getByDisplayValue('192.168.1.53')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    });
    expect(await screen.findByText('Todo listo')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    });
    expect(screen.getByText('Paso 3 de 3: Detalles')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(screen.getByText('Paso 2 de 3: Prueba')).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    });
    expect(writes).toEqual(['update']);
    expect(closed).toBe(1);
  });

  test('a new camera starts by picking its model, then goes to its connection', async () => {
    render(<CameraForm open onOpenChange={() => undefined} />);
    expect(screen.getByText('Paso 1 de 4: Modelo')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /^TP-Link Tapo C210/ }));
    expect(screen.getByText('Paso 2 de 4: Conexión')).toBeDefined();
  });

  test('a missing field is said under it in words and the step stays', async () => {
    render(<CameraForm open camera={cameraRow()} onOpenChange={() => undefined} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    });
    expect(screen.getByText('Paso 1 de 3: Conexión')).toBeDefined();
    expect(screen.getAllByText(REQUIRED).length).toBeGreaterThan(0);
  });

  test('a closed form renders nothing', () => {
    const { container } = render(<CameraForm open={false} onOpenChange={() => undefined} />);
    expect(container.textContent).toBe('');
  });

  test('a probe that could not run says why and offers to try again', () => {
    render(
      <ProbeStep
        probe={{
          running: false,
          result: null,
          failed: true,
          refusal: 'busy',
          run: async () => undefined,
          forget: () => undefined,
        }}
      />
    );
    expect(
      screen.getByText(
        'Ya hay una prueba de conexión en curso. Espera a que termine y vuelve a intentarlo.'
      )
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Probar de nuevo' })).toBeDefined();
  });

  test('the step parts render on their own', () => {
    expect([ModelStep, ConnectionStep, DetailsStep, SetupField].every(Boolean)).toBe(true);
  });
});
