import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { backendPath } from '@tests/support/backend-dir';
import { toModelProps } from '@/core/services/sync/entity-mappers';
import { CAMERA_PRIVACY_STATES } from '@/core/types';
import { cameraPrivacyMasked, parseCameraPrivacyState } from '@/shared/libs/camera-privacy';

const header = readFileSync(
  backendPath('packages/contracts/camera/src/camera/camera-privacy-state.hxx'),
  'utf8'
);

const wireNames = [...header.matchAll(/case CameraPrivacyState::(\w+):\s*return "(\w+)";/g)].map(
  ([, , wire = '']) => wire
);

type Probe = { method: string; route: string; probe: string; response: { status: number; json: unknown } };

const cameraProbes = (
  JSON.parse(readFileSync(backendPath('scripts/fixtures/http/camera.json'), 'utf8')) as {
    probes: Probe[];
  }
).probes;

describe('the camera privacy vocabulary mirrors the backend contract', () => {
  test('the states match camera-privacy-state.hxx, in its order', () => {
    expect(wireNames).toEqual([...CAMERA_PRIVACY_STATES]);
  });

  test('a name this build does not know reads as unknown, never as off', () => {
    for (const name of CAMERA_PRIVACY_STATES) {
      expect(parseCameraPrivacyState(name)).toBe(name);
    }
    expect(parseCameraPrivacyState('')).toBe('unknown');
    expect(parseCameraPrivacyState(null)).toBe('unknown');
    expect(parseCameraPrivacyState('covered')).toBe('unknown');
    expect(cameraPrivacyMasked('on')).toBe(true);
    expect(cameraPrivacyMasked('unknown')).toBe(false);
    expect(cameraPrivacyMasked('')).toBe(false);
  });

  test('the camera row the backend recorded carries the state the sync mapper reads', () => {
    const patched = cameraProbes.find(
      (probe) => probe.method === 'PATCH' && probe.route === '/camera/{1}' && probe.probe === 'owner'
    );
    const info = (patched?.response.json as { info: Record<string, unknown> }).info;
    expect(info.privacyState).toBe('unknown');
    expect(toModelProps('camera', info).privacyState).toBe('unknown');
  });
});
